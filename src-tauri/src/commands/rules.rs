use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

use crate::commands::scanner::FileInfo;
use crate::database::DbPath;
use crate::services::classifier::classify_extension;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rule {
    pub id: Option<i64>,
    pub name: String,
    pub priority: i32,
    pub enabled: bool,
    pub conditions: Vec<Condition>,
    pub condition_logic: String, // "AND" or "OR"
    pub action_type: String,     // "move", "copy", "rename", "delete"
    pub action_destination: Option<String>,
    pub action_rename_pattern: Option<String>,
    pub create_date_subfolder: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Condition {
    pub field: String,    // "name", "extension", "size", "createdDate", "modifiedDate"
    pub operator: String, // "equals", "contains", "startsWith", "endsWith", "greaterThan", "lessThan", "matches"
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleMatch {
    pub file: FileInfo,
    pub rule: Rule,
    pub action_preview: String,
}

/// Get all rules from database
#[tauri::command]
pub fn get_rules(db_state: State<DbPath>) -> Result<Vec<Rule>, String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, priority, enabled, conditions, condition_logic,
             action_type, action_destination, action_rename_pattern, create_date_subfolder
             FROM rules ORDER BY priority DESC",
        )
        .map_err(|e| e.to_string())?;

    let rules = stmt
        .query_map([], |row| {
            let conditions_json: String = row.get(4)?;
            let conditions: Vec<Condition> =
                serde_json::from_str(&conditions_json).unwrap_or_default();

            Ok(Rule {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                priority: row.get(2)?,
                enabled: row.get::<_, i32>(3)? != 0,
                conditions,
                condition_logic: row.get(5)?,
                action_type: row.get(6)?,
                action_destination: row.get(7)?,
                action_rename_pattern: row.get(8)?,
                create_date_subfolder: row.get::<_, i32>(9)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for rule in rules {
        if let Ok(r) = rule {
            result.push(r);
        }
    }

    Ok(result)
}

/// Save a rule (create or update)
#[tauri::command]
pub fn save_rule(db_state: State<DbPath>, rule: Rule) -> Result<Rule, String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let conditions_json = serde_json::to_string(&rule.conditions).map_err(|e| e.to_string())?;

    if let Some(id) = rule.id {
        // Update existing rule
        conn.execute(
            "UPDATE rules SET name = ?1, priority = ?2, enabled = ?3, conditions = ?4,
             condition_logic = ?5, action_type = ?6, action_destination = ?7,
             action_rename_pattern = ?8, create_date_subfolder = ?9, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?10",
            rusqlite::params![
                rule.name,
                rule.priority,
                rule.enabled as i32,
                conditions_json,
                rule.condition_logic,
                rule.action_type,
                rule.action_destination,
                rule.action_rename_pattern,
                rule.create_date_subfolder as i32,
                id,
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(rule)
    } else {
        // Create new rule
        conn.execute(
            "INSERT INTO rules (name, priority, enabled, conditions, condition_logic,
             action_type, action_destination, action_rename_pattern, create_date_subfolder)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                rule.name,
                rule.priority,
                rule.enabled as i32,
                conditions_json,
                rule.condition_logic,
                rule.action_type,
                rule.action_destination,
                rule.action_rename_pattern,
                rule.create_date_subfolder as i32,
            ],
        )
        .map_err(|e| e.to_string())?;

        let id = conn.last_insert_rowid();
        Ok(Rule {
            id: Some(id),
            ..rule
        })
    }
}

/// Delete a rule
#[tauri::command]
pub fn delete_rule(db_state: State<DbPath>, id: i64) -> Result<(), String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM rules WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Preview which files would be matched by rules
#[tauri::command]
pub fn preview_rules(
    db_state: State<DbPath>,
    source_path: String,
) -> Result<Vec<RuleMatch>, String> {
    let rules = get_rules(db_state)?;
    let enabled_rules: Vec<Rule> = rules.into_iter().filter(|r| r.enabled).collect();

    if enabled_rules.is_empty() {
        return Ok(Vec::new());
    }

    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    let mut matches: Vec<RuleMatch> = Vec::new();

    let entries = fs::read_dir(&source).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if file_name.starts_with('.') {
            continue;
        }

        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        let metadata = fs::metadata(&path).ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let category = classify_extension(&extension);

        let file_info = FileInfo {
            path: path.to_string_lossy().to_string(),
            name: file_name.clone(),
            extension: extension.clone(),
            size,
            size_formatted: format_size(size),
            created_at: get_time(&metadata, true),
            modified_at: get_time(&metadata, false),
            is_directory: false,
            is_hidden: file_name.starts_with('.'),
            category,
        };

        // Check each rule
        for rule in &enabled_rules {
            if evaluate_rule(&file_info, rule) {
                let action_preview = format_action_preview(rule, &file_info);
                matches.push(RuleMatch {
                    file: file_info.clone(),
                    rule: rule.clone(),
                    action_preview,
                });
                break; // First matching rule wins
            }
        }
    }

    Ok(matches)
}

/// Execute rules on files
#[tauri::command]
pub fn execute_rules(
    db_state: State<DbPath>,
    source_path: String,
) -> Result<ExecuteRulesResult, String> {
    let db_path = db_state.0.clone();

    // Get rules and compute matches inline instead of calling preview_rules
    let rules = get_rules_internal(&db_path)?;
    let enabled_rules: Vec<Rule> = rules.into_iter().filter(|r| r.enabled).collect();

    if enabled_rules.is_empty() {
        return Ok(ExecuteRulesResult {
            success: true,
            executed_count: 0,
            skipped_count: 0,
            errors: vec![],
        });
    }

    let matches = compute_matches(&source_path, &enabled_rules)?;

    let mut executed_count = 0;
    let mut skipped_count = 0;
    let mut errors: Vec<String> = Vec::new();
    let mut move_details: Vec<(String, String)> = Vec::new();

    for rule_match in matches {
        let result = execute_action(&rule_match.rule, &rule_match.file);
        match result {
            Ok(new_path) => {
                move_details.push((rule_match.file.path.clone(), new_path));
                executed_count += 1;
            }
            Err(e) => {
                errors.push(format!("{}: {}", rule_match.file.name, e));
                skipped_count += 1;
            }
        }
    }

    // Record history
    if executed_count > 0 {
        let details_json = serde_json::to_string(&move_details).unwrap_or_default();
        let _ = crate::database::add_history(
            &db_path,
            "organize",
            &format!("규칙 기반 정리: {}개 파일 처리", executed_count),
            &details_json,
        );
    }

    Ok(ExecuteRulesResult {
        success: errors.is_empty(),
        executed_count,
        skipped_count,
        errors,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteRulesResult {
    pub success: bool,
    pub executed_count: usize,
    pub skipped_count: usize,
    pub errors: Vec<String>,
}

// Helper functions

/// Internal function to get rules without State wrapper
fn get_rules_internal(db_path: &PathBuf) -> Result<Vec<Rule>, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, priority, enabled, conditions, condition_logic,
             action_type, action_destination, action_rename_pattern, create_date_subfolder
             FROM rules ORDER BY priority DESC",
        )
        .map_err(|e| e.to_string())?;

    let rules = stmt
        .query_map([], |row| {
            let conditions_json: String = row.get(4)?;
            let conditions: Vec<Condition> =
                serde_json::from_str(&conditions_json).unwrap_or_default();

            Ok(Rule {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                priority: row.get(2)?,
                enabled: row.get::<_, i32>(3)? != 0,
                conditions,
                condition_logic: row.get(5)?,
                action_type: row.get(6)?,
                action_destination: row.get(7)?,
                action_rename_pattern: row.get(8)?,
                create_date_subfolder: row.get::<_, i32>(9)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for rule in rules {
        if let Ok(r) = rule {
            result.push(r);
        }
    }

    Ok(result)
}

/// Compute matches for files in source_path against rules
fn compute_matches(source_path: &str, enabled_rules: &[Rule]) -> Result<Vec<RuleMatch>, String> {
    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    let mut matches: Vec<RuleMatch> = Vec::new();
    let entries = fs::read_dir(&source).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if file_name.starts_with('.') {
            continue;
        }

        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        let metadata = fs::metadata(&path).ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let category = classify_extension(&extension);

        let file_info = FileInfo {
            path: path.to_string_lossy().to_string(),
            name: file_name.clone(),
            extension: extension.clone(),
            size,
            size_formatted: format_size(size),
            created_at: get_time(&metadata, true),
            modified_at: get_time(&metadata, false),
            is_directory: false,
            is_hidden: file_name.starts_with('.'),
            category,
        };

        // Check each rule
        for rule in enabled_rules {
            if evaluate_rule(&file_info, rule) {
                let action_preview = format_action_preview(rule, &file_info);
                matches.push(RuleMatch {
                    file: file_info.clone(),
                    rule: rule.clone(),
                    action_preview,
                });
                break; // First matching rule wins
            }
        }
    }

    Ok(matches)
}

fn evaluate_rule(file: &FileInfo, rule: &Rule) -> bool {
    let results: Vec<bool> = rule
        .conditions
        .iter()
        .map(|c| evaluate_condition(file, c))
        .collect();

    if results.is_empty() {
        return false;
    }

    if rule.condition_logic == "AND" {
        results.iter().all(|&r| r)
    } else {
        results.iter().any(|&r| r)
    }
}

fn evaluate_condition(file: &FileInfo, condition: &Condition) -> bool {
    let field_value = match condition.field.as_str() {
        "name" => file.name.clone(),
        "extension" => file.extension.clone(),
        "size" => file.size.to_string(),
        "createdDate" => file.created_at.clone(),
        "modifiedDate" => file.modified_at.clone(),
        _ => return false,
    };

    match condition.operator.as_str() {
        "equals" => field_value.to_lowercase() == condition.value.to_lowercase(),
        "contains" => field_value.to_lowercase().contains(&condition.value.to_lowercase()),
        "startsWith" => field_value.to_lowercase().starts_with(&condition.value.to_lowercase()),
        "endsWith" => field_value.to_lowercase().ends_with(&condition.value.to_lowercase()),
        "greaterThan" => {
            if let (Ok(a), Ok(b)) = (field_value.parse::<u64>(), condition.value.parse::<u64>()) {
                a > b
            } else {
                false
            }
        }
        "lessThan" => {
            if let (Ok(a), Ok(b)) = (field_value.parse::<u64>(), condition.value.parse::<u64>()) {
                a < b
            } else {
                false
            }
        }
        "matches" => {
            if let Ok(re) = Regex::new(&condition.value) {
                re.is_match(&field_value)
            } else {
                false
            }
        }
        _ => false,
    }
}

fn format_action_preview(rule: &Rule, file: &FileInfo) -> String {
    match rule.action_type.as_str() {
        "move" => {
            if let Some(dest) = &rule.action_destination {
                format!("이동: {} → {}", file.name, dest)
            } else {
                format!("이동: {}", file.name)
            }
        }
        "copy" => {
            if let Some(dest) = &rule.action_destination {
                format!("복사: {} → {}", file.name, dest)
            } else {
                format!("복사: {}", file.name)
            }
        }
        "rename" => {
            if let Some(pattern) = &rule.action_rename_pattern {
                format!("이름변경: {} → {}", file.name, pattern)
            } else {
                format!("이름변경: {}", file.name)
            }
        }
        "delete" => format!("삭제: {}", file.name),
        _ => format!("알 수 없는 작업: {}", file.name),
    }
}

fn execute_action(rule: &Rule, file: &FileInfo) -> Result<String, String> {
    let source_path = PathBuf::from(&file.path);

    match rule.action_type.as_str() {
        "move" => {
            let dest_folder = rule
                .action_destination
                .as_ref()
                .ok_or("대상 폴더가 지정되지 않았습니다")?;

            let mut dest_path = PathBuf::from(dest_folder);

            if rule.create_date_subfolder {
                let date_folder = &file.modified_at[..7]; // YYYY-MM
                dest_path = dest_path.join(date_folder);
            }

            fs::create_dir_all(&dest_path).map_err(|e| e.to_string())?;

            let final_path = dest_path.join(&file.name);

            fs::rename(&source_path, &final_path).map_err(|e| {
                // Try copy + delete for cross-device moves
                if let Err(copy_err) = fs::copy(&source_path, &final_path) {
                    return format!("이동 실패: {}", copy_err);
                }
                let _ = fs::remove_file(&source_path);
                e.to_string()
            })?;

            Ok(final_path.to_string_lossy().to_string())
        }
        "copy" => {
            let dest_folder = rule
                .action_destination
                .as_ref()
                .ok_or("대상 폴더가 지정되지 않았습니다")?;

            let mut dest_path = PathBuf::from(dest_folder);

            if rule.create_date_subfolder {
                let date_folder = &file.modified_at[..7];
                dest_path = dest_path.join(date_folder);
            }

            fs::create_dir_all(&dest_path).map_err(|e| e.to_string())?;

            let final_path = dest_path.join(&file.name);
            fs::copy(&source_path, &final_path).map_err(|e| e.to_string())?;

            Ok(final_path.to_string_lossy().to_string())
        }
        "delete" => {
            trash::delete(&source_path).map_err(|e| e.to_string())?;
            Ok(file.path.clone())
        }
        _ => Err("지원되지 않는 작업입니다".to_string()),
    }
}

fn format_size(size: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if size >= GB {
        format!("{:.1}GB", size as f64 / GB as f64)
    } else if size >= MB {
        format!("{:.1}MB", size as f64 / MB as f64)
    } else if size >= KB {
        format!("{:.1}KB", size as f64 / KB as f64)
    } else {
        format!("{}B", size)
    }
}

fn get_time(metadata: &Option<fs::Metadata>, created: bool) -> String {
    metadata
        .as_ref()
        .and_then(|m| {
            if created {
                m.created().ok()
            } else {
                m.modified().ok()
            }
        })
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Local> = t.into();
            datetime.format("%Y-%m-%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|| "Unknown".to_string())
}

// ============================================================================
// Default Rules (기본 카테고리 규칙)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultRule {
    pub id: i64,
    pub category: String,
    pub enabled: bool,
    pub destination: String,
    pub create_date_subfolder: bool,
    pub priority: i32,
}

/// Get default category rules
#[tauri::command]
pub fn get_default_rules(db_state: State<DbPath>) -> Result<Vec<DefaultRule>, String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    // Check if default_rules table exists, if not create it
    conn.execute(
        "CREATE TABLE IF NOT EXISTS default_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL UNIQUE,
            enabled INTEGER NOT NULL DEFAULT 1,
            destination TEXT NOT NULL,
            create_date_subfolder INTEGER DEFAULT 0,
            priority INTEGER DEFAULT 0
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Add priority column if it doesn't exist (migration for existing DBs)
    let _ = conn.execute("ALTER TABLE default_rules ADD COLUMN priority INTEGER DEFAULT 0", []);

    // Get existing rules ordered by priority
    let mut stmt = conn
        .prepare("SELECT id, category, enabled, destination, create_date_subfolder, COALESCE(priority, 0) FROM default_rules ORDER BY priority ASC")
        .map_err(|e| e.to_string())?;

    let rules: Vec<DefaultRule> = stmt
        .query_map([], |row| {
            Ok(DefaultRule {
                id: row.get(0)?,
                category: row.get(1)?,
                enabled: row.get::<_, i32>(2)? != 0,
                destination: row.get(3)?,
                create_date_subfolder: row.get::<_, i32>(4)? != 0,
                priority: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // If no rules exist, create defaults
    if rules.is_empty() {
        let default_categories = [
            ("images", "Images", 0),
            ("documents", "Documents", 1),
            ("videos", "Videos", 2),
            ("music", "Music", 3),
            ("archives", "Archives", 4),
            ("installers", "Installers", 5),
            ("code", "Code", 6),
            ("others", "Others", 7),
        ];

        for (category, folder, priority) in default_categories {
            conn.execute(
                "INSERT OR IGNORE INTO default_rules (category, enabled, destination, create_date_subfolder, priority) VALUES (?1, 1, ?2, 0, ?3)",
                rusqlite::params![category, folder, priority],
            )
            .map_err(|e| e.to_string())?;
        }

        // Re-fetch after insert
        return get_default_rules(db_state);
    }

    Ok(rules)
}

/// Save a default rule
#[tauri::command]
pub fn save_default_rule(db_state: State<DbPath>, rule: DefaultRule) -> Result<DefaultRule, String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE default_rules SET enabled = ?1, destination = ?2, create_date_subfolder = ?3, priority = ?4 WHERE id = ?5",
        rusqlite::params![
            rule.enabled as i32,
            rule.destination,
            rule.create_date_subfolder as i32,
            rule.priority,
            rule.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(rule)
}

// ============================================================================
// Unified Organization (통합 정리)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnifiedPreview {
    pub file: FileInfo,
    pub match_type: String, // "custom" or "default"
    pub rule: Option<Rule>,
    pub default_rule: Option<DefaultRule>,
    pub action: String,
    pub destination: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnifiedOrganizeResult {
    pub success: bool,
    pub files_moved: usize,
    pub files_skipped: usize,
    pub errors: Vec<String>,
    pub history_id: i64,
}

/// Preview unified organization (custom rules first, then default category rules)
#[tauri::command]
pub fn preview_unified(
    db_state: State<DbPath>,
    source_path: String,
) -> Result<Vec<UnifiedPreview>, String> {
    let db_path = &db_state.0;

    // Get custom rules
    let custom_rules = get_rules_internal(db_path)?;
    let enabled_custom_rules: Vec<Rule> = custom_rules.into_iter().filter(|r| r.enabled).collect();

    // Get default rules
    let default_rules = get_default_rules_internal(db_path)?;
    let enabled_default_rules: Vec<DefaultRule> = default_rules.into_iter().filter(|r| r.enabled).collect();

    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    let mut previews: Vec<UnifiedPreview> = Vec::new();
    let entries = fs::read_dir(&source).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if file_name.starts_with('.') {
            continue;
        }

        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        let metadata = fs::metadata(&path).ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let category = classify_extension(&extension);

        let file_info = FileInfo {
            path: path.to_string_lossy().to_string(),
            name: file_name.clone(),
            extension: extension.clone(),
            size,
            size_formatted: format_size(size),
            created_at: get_time(&metadata, true),
            modified_at: get_time(&metadata, false),
            is_directory: false,
            is_hidden: file_name.starts_with('.'),
            category: category.clone(),
        };

        // Try custom rules first
        let mut matched = false;
        for rule in &enabled_custom_rules {
            if evaluate_rule(&file_info, rule) {
                let dest = rule.action_destination.clone().unwrap_or_default();
                previews.push(UnifiedPreview {
                    file: file_info.clone(),
                    match_type: "custom".to_string(),
                    rule: Some(rule.clone()),
                    default_rule: None,
                    action: format_action_preview(rule, &file_info),
                    destination: dest,
                });
                matched = true;
                break;
            }
        }

        // If no custom rule matched, try default category rules
        if !matched {
            let category_str = format!("{:?}", category).to_lowercase();
            if let Some(default_rule) = enabled_default_rules.iter().find(|r| r.category == category_str) {
                let dest_path = source.join(&default_rule.destination);
                previews.push(UnifiedPreview {
                    file: file_info.clone(),
                    match_type: "default".to_string(),
                    rule: None,
                    default_rule: Some(default_rule.clone()),
                    action: format!("이동: {} → {}", file_info.name, default_rule.destination),
                    destination: dest_path.to_string_lossy().to_string(),
                });
            }
        }
    }

    Ok(previews)
}

/// Execute unified organization
#[tauri::command]
pub fn execute_unified(
    db_state: State<DbPath>,
    source_path: String,
    excluded_destinations: Option<Vec<String>>,
) -> Result<UnifiedOrganizeResult, String> {
    let db_path = db_state.0.clone();
    let previews = preview_unified_internal(&db_path, &source_path)?;
    let excluded = excluded_destinations.unwrap_or_default();

    let mut files_moved = 0;
    let mut files_skipped = 0;
    let mut errors: Vec<String> = Vec::new();
    let mut move_details: Vec<(String, String)> = Vec::new();

    let source = PathBuf::from(&source_path);

    for preview in previews {
        // Skip files in excluded destinations
        if excluded.contains(&preview.destination) {
            files_skipped += 1;
            continue;
        }
        let source_file = PathBuf::from(&preview.file.path);

        let dest_folder = if preview.match_type == "custom" {
            if let Some(rule) = &preview.rule {
                let mut dest = PathBuf::from(rule.action_destination.clone().unwrap_or_default());
                if rule.create_date_subfolder && preview.file.modified_at.len() >= 7 {
                    dest = dest.join(&preview.file.modified_at[..7]);
                }
                dest
            } else {
                continue;
            }
        } else {
            if let Some(default_rule) = &preview.default_rule {
                let mut dest = source.join(&default_rule.destination);
                if default_rule.create_date_subfolder && preview.file.modified_at.len() >= 7 {
                    dest = dest.join(&preview.file.modified_at[..7]);
                }
                dest
            } else {
                continue;
            }
        };

        // Create destination folder
        if let Err(e) = fs::create_dir_all(&dest_folder) {
            errors.push(format!("폴더 생성 실패 {}: {}", dest_folder.display(), e));
            files_skipped += 1;
            continue;
        }

        let dest_file = dest_folder.join(&preview.file.name);

        // Move file
        match fs::rename(&source_file, &dest_file) {
            Ok(_) => {
                move_details.push((
                    preview.file.path.clone(),
                    dest_file.to_string_lossy().to_string(),
                ));
                files_moved += 1;
            }
            Err(_) => {
                // Try copy + delete for cross-device moves
                match fs::copy(&source_file, &dest_file) {
                    Ok(_) => {
                        if let Err(e) = fs::remove_file(&source_file) {
                            errors.push(format!("원본 삭제 실패 {}: {}", preview.file.name, e));
                        }
                        move_details.push((
                            preview.file.path.clone(),
                            dest_file.to_string_lossy().to_string(),
                        ));
                        files_moved += 1;
                    }
                    Err(e) => {
                        errors.push(format!("파일 이동 실패 {}: {}", preview.file.name, e));
                        files_skipped += 1;
                    }
                }
            }
        }
    }

    // Record history
    let details_json = serde_json::to_string(&move_details).unwrap_or_default();
    let history_id = crate::database::add_history(
        &db_path,
        "organize",
        &format!("통합 정리: {}개 파일 이동", files_moved),
        &details_json,
    )
    .unwrap_or(-1);

    Ok(UnifiedOrganizeResult {
        success: errors.is_empty(),
        files_moved,
        files_skipped,
        errors,
        history_id,
    })
}

/// Internal function to get default rules without State wrapper
fn get_default_rules_internal(db_path: &PathBuf) -> Result<Vec<DefaultRule>, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    // Ensure table exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS default_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL UNIQUE,
            enabled INTEGER NOT NULL DEFAULT 1,
            destination TEXT NOT NULL,
            create_date_subfolder INTEGER DEFAULT 0,
            priority INTEGER DEFAULT 0
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Add priority column if it doesn't exist (migration for existing DBs)
    let _ = conn.execute("ALTER TABLE default_rules ADD COLUMN priority INTEGER DEFAULT 0", []);

    let mut stmt = conn
        .prepare("SELECT id, category, enabled, destination, create_date_subfolder, COALESCE(priority, 0) FROM default_rules ORDER BY priority ASC")
        .map_err(|e| e.to_string())?;

    let rules: Vec<DefaultRule> = stmt
        .query_map([], |row| {
            Ok(DefaultRule {
                id: row.get(0)?,
                category: row.get(1)?,
                enabled: row.get::<_, i32>(2)? != 0,
                destination: row.get(3)?,
                create_date_subfolder: row.get::<_, i32>(4)? != 0,
                priority: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // If no rules exist, create defaults
    if rules.is_empty() {
        let default_categories = [
            ("images", "Images", 0),
            ("documents", "Documents", 1),
            ("videos", "Videos", 2),
            ("music", "Music", 3),
            ("archives", "Archives", 4),
            ("installers", "Installers", 5),
            ("code", "Code", 6),
            ("others", "Others", 7),
        ];

        for (category, folder, priority) in default_categories {
            conn.execute(
                "INSERT OR IGNORE INTO default_rules (category, enabled, destination, create_date_subfolder, priority) VALUES (?1, 1, ?2, 0, ?3)",
                rusqlite::params![category, folder, priority],
            )
            .map_err(|e| e.to_string())?;
        }

        // Re-fetch after insert
        return get_default_rules_internal(db_path);
    }

    Ok(rules)
}

// ============================================================================
// Extension Mappings (확장자 매핑)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionMapping {
    pub id: Option<i64>,
    pub extension: String,
    pub category: String,
    pub target_folder: String,
}

/// Get all extension mappings
#[tauri::command]
pub fn get_extension_mappings(db_state: State<DbPath>) -> Result<Vec<ExtensionMapping>, String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, extension, category, target_folder FROM extension_mappings ORDER BY category, extension")
        .map_err(|e| e.to_string())?;

    let mappings: Vec<ExtensionMapping> = stmt
        .query_map([], |row| {
            Ok(ExtensionMapping {
                id: Some(row.get(0)?),
                extension: row.get(1)?,
                category: row.get(2)?,
                target_folder: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(mappings)
}

/// Get extension mappings by category
#[tauri::command]
pub fn get_extensions_by_category(db_state: State<DbPath>, category: String) -> Result<Vec<String>, String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT extension FROM extension_mappings WHERE category = ?1 ORDER BY extension")
        .map_err(|e| e.to_string())?;

    let extensions: Vec<String> = stmt
        .query_map([&category], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(extensions)
}

/// Add an extension mapping
#[tauri::command]
pub fn add_extension_mapping(
    db_state: State<DbPath>,
    extension: String,
    category: String,
    target_folder: String,
) -> Result<ExtensionMapping, String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    // Normalize extension (ensure it starts with a dot)
    let ext = if extension.starts_with('.') {
        extension.to_lowercase()
    } else {
        format!(".{}", extension.to_lowercase())
    };

    conn.execute(
        "INSERT OR REPLACE INTO extension_mappings (extension, category, target_folder) VALUES (?1, ?2, ?3)",
        rusqlite::params![ext, category, target_folder],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(ExtensionMapping {
        id: Some(id),
        extension: ext,
        category,
        target_folder,
    })
}

/// Remove an extension mapping
#[tauri::command]
pub fn remove_extension_mapping(db_state: State<DbPath>, extension: String) -> Result<(), String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    // Normalize extension
    let ext = if extension.starts_with('.') {
        extension.to_lowercase()
    } else {
        format!(".{}", extension.to_lowercase())
    };

    conn.execute(
        "DELETE FROM extension_mappings WHERE extension = ?1",
        [&ext],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Update extensions for a category (replace all)
#[tauri::command]
pub fn update_category_extensions(
    db_state: State<DbPath>,
    category: String,
    extensions: Vec<String>,
    target_folder: String,
) -> Result<(), String> {
    let db_path = &db_state.0;
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    // Delete existing mappings for this category
    conn.execute(
        "DELETE FROM extension_mappings WHERE category = ?1",
        [&category],
    )
    .map_err(|e| e.to_string())?;

    // Insert new mappings
    for ext in extensions {
        let normalized = if ext.starts_with('.') {
            ext.to_lowercase()
        } else {
            format!(".{}", ext.to_lowercase())
        };

        conn.execute(
            "INSERT INTO extension_mappings (extension, category, target_folder) VALUES (?1, ?2, ?3)",
            rusqlite::params![normalized, category, target_folder],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Internal function to preview unified without State wrapper
fn preview_unified_internal(db_path: &PathBuf, source_path: &str) -> Result<Vec<UnifiedPreview>, String> {
    // Get custom rules
    let custom_rules = get_rules_internal(db_path)?;
    let enabled_custom_rules: Vec<Rule> = custom_rules.into_iter().filter(|r| r.enabled).collect();

    // Get default rules
    let default_rules = get_default_rules_internal(db_path)?;
    let enabled_default_rules: Vec<DefaultRule> = default_rules.into_iter().filter(|r| r.enabled).collect();

    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    let mut previews: Vec<UnifiedPreview> = Vec::new();
    let entries = fs::read_dir(&source).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if file_name.starts_with('.') {
            continue;
        }

        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        let metadata = fs::metadata(&path).ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let category = classify_extension(&extension);

        let file_info = FileInfo {
            path: path.to_string_lossy().to_string(),
            name: file_name.clone(),
            extension: extension.clone(),
            size,
            size_formatted: format_size(size),
            created_at: get_time(&metadata, true),
            modified_at: get_time(&metadata, false),
            is_directory: false,
            is_hidden: file_name.starts_with('.'),
            category: category.clone(),
        };

        // Try custom rules first
        let mut matched = false;
        for rule in &enabled_custom_rules {
            if evaluate_rule(&file_info, rule) {
                let dest = rule.action_destination.clone().unwrap_or_default();
                previews.push(UnifiedPreview {
                    file: file_info.clone(),
                    match_type: "custom".to_string(),
                    rule: Some(rule.clone()),
                    default_rule: None,
                    action: format_action_preview(rule, &file_info),
                    destination: dest,
                });
                matched = true;
                break;
            }
        }

        // If no custom rule matched, try default category rules
        if !matched {
            let category_str = format!("{:?}", category).to_lowercase();
            if let Some(default_rule) = enabled_default_rules.iter().find(|r| r.category == category_str) {
                let dest_path = source.join(&default_rule.destination);
                previews.push(UnifiedPreview {
                    file: file_info.clone(),
                    match_type: "default".to_string(),
                    rule: None,
                    default_rule: Some(default_rule.clone()),
                    action: format!("이동: {} → {}", file_info.name, default_rule.destination),
                    destination: dest_path.to_string_lossy().to_string(),
                });
            }
        }
    }

    Ok(previews)
}
