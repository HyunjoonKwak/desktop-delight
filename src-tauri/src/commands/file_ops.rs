use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

use crate::database::{self, DbPath};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum OverwriteStrategy {
    Overwrite,
    Rename,
    Skip,
}

fn get_unique_path(path: &PathBuf) -> PathBuf {
    if !path.exists() {
        return path.clone();
    }

    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    let parent = path.parent().unwrap_or(path);

    let mut counter = 1;
    loop {
        let new_name = if extension.is_empty() {
            format!("{}_{}", stem, counter)
        } else {
            format!("{}_{}.{}", stem, counter, extension)
        };

        let new_path = parent.join(new_name);
        if !new_path.exists() {
            return new_path;
        }
        counter += 1;
    }
}

#[tauri::command]
pub fn move_file(
    source: String,
    dest: String,
    overwrite: OverwriteStrategy,
    db_path: State<DbPath>,
) -> Result<String, String> {
    let source_path = PathBuf::from(&source);
    let mut dest_path = PathBuf::from(&dest);

    if !source_path.exists() {
        return Err(format!("Source file does not exist: {}", source));
    }

    // If dest is a directory, move file into it with same name
    if dest_path.is_dir() {
        if let Some(file_name) = source_path.file_name() {
            dest_path = dest_path.join(file_name);
        }
    }

    // Handle existing destination
    if dest_path.exists() {
        match overwrite {
            OverwriteStrategy::Overwrite => {
                fs::remove_file(&dest_path).map_err(|e| e.to_string())?;
            }
            OverwriteStrategy::Rename => {
                dest_path = get_unique_path(&dest_path);
            }
            OverwriteStrategy::Skip => {
                return Ok(dest_path.to_string_lossy().to_string());
            }
        }
    }

    // Ensure parent directory exists
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Move file
    fs::rename(&source_path, &dest_path).map_err(|e| e.to_string())?;

    // Record in history
    let undo_data = serde_json::json!({
        "original_path": source,
        "new_path": dest_path.to_string_lossy(),
        "action": "move"
    });

    database::add_history(
        &db_path.0,
        "move",
        &format!("파일 이동: {}", source_path.file_name().unwrap_or_default().to_string_lossy()),
        &undo_data.to_string(),
    )?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn copy_file(
    source: String,
    dest: String,
    overwrite: OverwriteStrategy,
    db_path: State<DbPath>,
) -> Result<String, String> {
    let source_path = PathBuf::from(&source);
    let mut dest_path = PathBuf::from(&dest);

    if !source_path.exists() {
        return Err(format!("Source file does not exist: {}", source));
    }

    // If dest is a directory, copy file into it with same name
    if dest_path.is_dir() {
        if let Some(file_name) = source_path.file_name() {
            dest_path = dest_path.join(file_name);
        }
    }

    // Handle existing destination
    if dest_path.exists() {
        match overwrite {
            OverwriteStrategy::Overwrite => {
                fs::remove_file(&dest_path).map_err(|e| e.to_string())?;
            }
            OverwriteStrategy::Rename => {
                dest_path = get_unique_path(&dest_path);
            }
            OverwriteStrategy::Skip => {
                return Ok(dest_path.to_string_lossy().to_string());
            }
        }
    }

    // Ensure parent directory exists
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Copy file
    fs::copy(&source_path, &dest_path).map_err(|e| e.to_string())?;

    // Record in history
    let undo_data = serde_json::json!({
        "copied_path": dest_path.to_string_lossy(),
        "action": "copy"
    });

    database::add_history(
        &db_path.0,
        "copy",
        &format!("파일 복사: {}", source_path.file_name().unwrap_or_default().to_string_lossy()),
        &undo_data.to_string(),
    )?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_file(path: String, to_trash: bool, db_path: State<DbPath>) -> Result<(), String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    if to_trash {
        trash::delete(&file_path).map_err(|e| e.to_string())?;
    } else {
        if file_path.is_dir() {
            fs::remove_dir_all(&file_path).map_err(|e| e.to_string())?;
        } else {
            fs::remove_file(&file_path).map_err(|e| e.to_string())?;
        }
    }

    // Record in history (note: undo is limited for permanent delete)
    let undo_data = serde_json::json!({
        "deleted_path": path,
        "to_trash": to_trash,
        "action": "delete"
    });

    database::add_history(
        &db_path.0,
        "delete",
        &format!("파일 삭제: {}", file_path.file_name().unwrap_or_default().to_string_lossy()),
        &undo_data.to_string(),
    )?;

    Ok(())
}

#[tauri::command]
pub fn rename_file(path: String, new_name: String, db_path: State<DbPath>) -> Result<String, String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let parent = file_path.parent().ok_or("Cannot get parent directory")?;
    let new_path = parent.join(&new_name);

    if new_path.exists() {
        return Err(format!("File already exists: {}", new_path.display()));
    }

    let old_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    fs::rename(&file_path, &new_path).map_err(|e| e.to_string())?;

    // Record in history
    let undo_data = serde_json::json!({
        "original_path": path,
        "new_path": new_path.to_string_lossy(),
        "old_name": old_name,
        "new_name": new_name,
        "action": "rename"
    });

    database::add_history(
        &db_path.0,
        "rename",
        &format!("이름 변경: {} → {}", old_name, new_name),
        &undo_data.to_string(),
    )?;

    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
    let folder_path = PathBuf::from(&path);

    if folder_path.exists() {
        return Err(format!("Folder already exists: {}", path));
    }

    fs::create_dir_all(&folder_path).map_err(|e| e.to_string())?;

    Ok(())
}
