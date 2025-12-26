use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

use crate::database::DbPath;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameRule {
    pub rule_type: String, // "findReplace", "prefix", "suffix", "sequence", "date", "case", "regex"
    pub find_text: Option<String>,
    pub replace_text: Option<String>,
    pub prefix: Option<String>,
    pub suffix: Option<String>,
    pub start_number: Option<i32>,
    pub digit_count: Option<i32>,
    pub date_format: Option<String>,
    pub date_source: Option<String>, // "created" or "modified"
    pub case_type: Option<String>,   // "upper", "lower", "title"
    pub regex_pattern: Option<String>,
    pub regex_replace: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenamePreview {
    pub original_path: String,
    pub original_name: String,
    pub new_name: String,
    pub has_conflict: bool,
    pub conflict_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameResult {
    pub success: bool,
    pub renamed_count: usize,
    pub failed_count: usize,
    pub errors: Vec<String>,
}

/// Preview rename operation
#[tauri::command]
pub fn preview_rename(
    file_paths: Vec<String>,
    rules: Vec<RenameRule>,
) -> Result<Vec<RenamePreview>, String> {
    let mut previews: Vec<RenamePreview> = Vec::new();
    let mut new_names: Vec<String> = Vec::new();
    let mut sequence_counter = rules
        .iter()
        .find(|r| r.rule_type == "sequence")
        .and_then(|r| r.start_number)
        .unwrap_or(1);

    for file_path in &file_paths {
        let path = PathBuf::from(file_path);
        let original_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // Get file stem and extension
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&original_name)
            .to_string();
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e))
            .unwrap_or_default();

        // Apply rules to get new name
        let mut new_stem = stem.clone();

        for rule in &rules {
            new_stem = apply_rule(&new_stem, rule, &path, &mut sequence_counter);
        }

        let new_name = format!("{}{}", new_stem, extension);

        // Check for conflicts
        let has_conflict = new_names.contains(&new_name);
        let conflict_message = if has_conflict {
            Some("이름이 중복됩니다".to_string())
        } else {
            None
        };

        new_names.push(new_name.clone());

        previews.push(RenamePreview {
            original_path: file_path.clone(),
            original_name,
            new_name,
            has_conflict,
            conflict_message,
        });
    }

    Ok(previews)
}

/// Execute rename operation
#[tauri::command]
pub fn execute_rename(
    db_state: State<DbPath>,
    file_paths: Vec<String>,
    rules: Vec<RenameRule>,
) -> Result<RenameResult, String> {
    let db_path = &db_state.0;

    let previews = preview_rename(file_paths.clone(), rules)?;

    let mut renamed_count = 0;
    let mut failed_count = 0;
    let mut errors: Vec<String> = Vec::new();
    let mut rename_details: Vec<(String, String)> = Vec::new();

    for preview in &previews {
        if preview.has_conflict {
            failed_count += 1;
            errors.push(format!(
                "Skip {}: {}",
                preview.original_name,
                preview.conflict_message.as_deref().unwrap_or("conflict")
            ));
            continue;
        }

        let original_path = PathBuf::from(&preview.original_path);
        let new_path = original_path.with_file_name(&preview.new_name);

        if new_path.exists() && preview.original_name != preview.new_name {
            failed_count += 1;
            errors.push(format!("File already exists: {}", preview.new_name));
            continue;
        }

        match fs::rename(&original_path, &new_path) {
            Ok(_) => {
                rename_details.push((
                    preview.original_path.clone(),
                    new_path.to_string_lossy().to_string(),
                ));
                renamed_count += 1;
            }
            Err(e) => {
                failed_count += 1;
                errors.push(format!("Failed to rename {}: {}", preview.original_name, e));
            }
        }
    }

    // Record history
    if renamed_count > 0 {
        let details_json = serde_json::json!({
            "action": "rename",
            "files": rename_details.iter().map(|(orig, new)| {
                serde_json::json!({
                    "original_path": orig,
                    "new_path": new
                })
            }).collect::<Vec<_>>()
        });

        let _ = crate::database::add_history(
            db_path,
            "rename",
            &format!("{}개 파일 이름 변경", renamed_count),
            &details_json.to_string(),
        );
    }

    Ok(RenameResult {
        success: failed_count == 0,
        renamed_count,
        failed_count,
        errors,
    })
}

fn apply_rule(stem: &str, rule: &RenameRule, path: &PathBuf, sequence: &mut i32) -> String {
    match rule.rule_type.as_str() {
        "findReplace" => {
            let find = rule.find_text.as_deref().unwrap_or("");
            let replace = rule.replace_text.as_deref().unwrap_or("");
            if !find.is_empty() {
                stem.replace(find, replace)
            } else {
                stem.to_string()
            }
        }
        "prefix" => {
            let prefix = rule.prefix.as_deref().unwrap_or("");
            format!("{}{}", prefix, stem)
        }
        "suffix" => {
            let suffix = rule.suffix.as_deref().unwrap_or("");
            format!("{}{}", stem, suffix)
        }
        "sequence" => {
            let digit_count = rule.digit_count.unwrap_or(3) as usize;
            let seq_str = format!("{:0>width$}", sequence, width = digit_count);
            *sequence += 1;
            format!("{}_{}", stem, seq_str)
        }
        "date" => {
            let format = rule.date_format.as_deref().unwrap_or("%Y%m%d");
            let date_source = rule.date_source.as_deref().unwrap_or("modified");

            let datetime = if date_source == "created" {
                fs::metadata(path)
                    .and_then(|m| m.created())
                    .ok()
            } else {
                fs::metadata(path)
                    .and_then(|m| m.modified())
                    .ok()
            };

            if let Some(time) = datetime {
                let dt: chrono::DateTime<chrono::Local> = time.into();
                let date_str = dt.format(format).to_string();
                format!("{}_{}", stem, date_str)
            } else {
                stem.to_string()
            }
        }
        "case" => {
            let case_type = rule.case_type.as_deref().unwrap_or("lower");
            match case_type {
                "upper" => stem.to_uppercase(),
                "lower" => stem.to_lowercase(),
                "title" => {
                    // Simple title case
                    stem.split_whitespace()
                        .map(|word| {
                            let mut chars = word.chars();
                            match chars.next() {
                                Some(first) => {
                                    first.to_uppercase().collect::<String>()
                                        + chars.as_str().to_lowercase().as_str()
                                }
                                None => String::new(),
                            }
                        })
                        .collect::<Vec<_>>()
                        .join(" ")
                }
                _ => stem.to_string(),
            }
        }
        "regex" => {
            let pattern = rule.regex_pattern.as_deref().unwrap_or("");
            let replace = rule.regex_replace.as_deref().unwrap_or("");

            if let Ok(re) = Regex::new(pattern) {
                re.replace_all(stem, replace).to_string()
            } else {
                stem.to_string()
            }
        }
        _ => stem.to_string(),
    }
}
