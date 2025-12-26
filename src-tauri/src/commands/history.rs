use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use tauri::State;

use crate::database::{self, DbPath};

/// Clean up empty folders after undoing an organize operation
fn cleanup_empty_folders(undo_data: &serde_json::Value) {
    let mut folders_to_check: HashSet<PathBuf> = HashSet::new();

    // Collect all destination folders from the undo data
    if let Some(moves) = undo_data.as_array() {
        for move_item in moves {
            if let Some(arr) = move_item.as_array() {
                if arr.len() >= 2 {
                    if let Some(new_path) = arr[1].as_str() {
                        let path = PathBuf::from(new_path);
                        if let Some(parent) = path.parent() {
                            folders_to_check.insert(parent.to_path_buf());
                        }
                    }
                }
            }
        }
    }

    // Try to remove empty folders (will fail silently if not empty)
    for folder in folders_to_check {
        // Try to remove the folder if empty
        let _ = fs::remove_dir(&folder);

        // Also try to remove parent category folder if it becomes empty
        if let Some(parent) = folder.parent() {
            let _ = fs::remove_dir(parent);
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItem {
    pub id: i64,
    pub operation_type: String,
    pub description: String,
    pub details: Option<String>,
    pub files_affected: i32,
    pub is_undone: bool,
    pub created_at: String,
}

#[tauri::command]
pub fn get_history(limit: i32, offset: i32, db_path: State<DbPath>) -> Result<Vec<HistoryItem>, String> {
    database::get_history(&db_path.0, limit, offset)
}

#[tauri::command]
pub fn undo_operation(id: i64, db_path: State<DbPath>) -> Result<(), String> {
    // Get the history item
    let item = database::get_history_item(&db_path.0, id)?;

    if item.is_undone {
        return Err("Operation has already been undone".to_string());
    }

    // Parse undo data
    let undo_data: serde_json::Value =
        serde_json::from_str(&item.details.unwrap_or_default()).map_err(|e| e.to_string())?;

    let action = undo_data["action"].as_str().unwrap_or("");

    match action {
        "move" => {
            let original_path = undo_data["original_path"]
                .as_str()
                .ok_or("Missing original_path")?;
            let new_path = undo_data["new_path"].as_str().ok_or("Missing new_path")?;

            // Move back
            let new_path_buf = PathBuf::from(new_path);
            let original_path_buf = PathBuf::from(original_path);

            if new_path_buf.exists() {
                // Ensure parent directory exists
                if let Some(parent) = original_path_buf.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                fs::rename(&new_path_buf, &original_path_buf).map_err(|e| e.to_string())?;
            }
        }
        "copy" => {
            let copied_path = undo_data["copied_path"]
                .as_str()
                .ok_or("Missing copied_path")?;

            // Delete the copy
            let copied_path_buf = PathBuf::from(copied_path);
            if copied_path_buf.exists() {
                fs::remove_file(&copied_path_buf).map_err(|e| e.to_string())?;
            }
        }
        "rename" => {
            let original_path = undo_data["original_path"]
                .as_str()
                .ok_or("Missing original_path")?;
            let new_path = undo_data["new_path"].as_str().ok_or("Missing new_path")?;

            // Rename back
            let new_path_buf = PathBuf::from(new_path);
            let original_path_buf = PathBuf::from(original_path);

            if new_path_buf.exists() {
                fs::rename(&new_path_buf, &original_path_buf).map_err(|e| e.to_string())?;
            }
        }
        "delete" => {
            // Note: We can only undo trash deletes if supported by the OS
            let to_trash = undo_data["to_trash"].as_bool().unwrap_or(false);
            if !to_trash {
                return Err("Cannot undo permanent delete".to_string());
            }
            // Trash undo is OS-specific and not directly supported
            return Err("Trash undo not implemented. Please restore from trash manually.".to_string());
        }
        _ => {
            // Handle organize operation - undo_data is array of [original_path, new_path] tuples
            if let Some(moves) = undo_data.as_array() {
                let mut undo_errors: Vec<String> = Vec::new();

                for move_item in moves {
                    if let Some(arr) = move_item.as_array() {
                        if arr.len() >= 2 {
                            let original_path = arr[0].as_str().unwrap_or("");
                            let new_path = arr[1].as_str().unwrap_or("");

                            if !original_path.is_empty() && !new_path.is_empty() {
                                let new_path_buf = PathBuf::from(new_path);
                                let original_path_buf = PathBuf::from(original_path);

                                if new_path_buf.exists() {
                                    // Ensure parent directory exists
                                    if let Some(parent) = original_path_buf.parent() {
                                        if let Err(e) = fs::create_dir_all(parent) {
                                            undo_errors.push(format!("Failed to create dir: {}", e));
                                            continue;
                                        }
                                    }

                                    if let Err(e) = fs::rename(&new_path_buf, &original_path_buf) {
                                        // Try copy + delete for cross-device moves
                                        if let Err(copy_err) = fs::copy(&new_path_buf, &original_path_buf) {
                                            undo_errors.push(format!("Failed to move {}: {}", new_path, copy_err));
                                            continue;
                                        }
                                        let _ = fs::remove_file(&new_path_buf);
                                    }
                                }
                            }
                        }
                    }
                }

                // Clean up empty category folders
                cleanup_empty_folders(&undo_data);

                if !undo_errors.is_empty() {
                    return Err(format!("Some files could not be restored: {:?}", undo_errors));
                }
            } else {
                return Err(format!("Unknown action type or invalid undo data"));
            }
        }
    }

    // Mark as undone
    database::mark_history_undone(&db_path.0, id)?;

    Ok(())
}

#[tauri::command]
pub fn clear_history(db_path: State<DbPath>) -> Result<(), String> {
    database::clear_history(&db_path.0)
}
