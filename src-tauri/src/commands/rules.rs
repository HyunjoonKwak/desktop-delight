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
