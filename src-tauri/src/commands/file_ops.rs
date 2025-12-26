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

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupResult {
    pub backup_path: String,
    pub files_count: usize,
    pub total_size: u64,
}

/// Backup desktop folder to a timestamped directory
#[tauri::command]
pub fn backup_desktop(backup_location: Option<String>) -> Result<BackupResult, String> {
    use chrono::Local;
    use directories::UserDirs;
    use walkdir::WalkDir;

    let user_dirs = UserDirs::new().ok_or("Cannot find user directories")?;

    // Get desktop path
    let desktop_path = user_dirs.desktop_dir()
        .ok_or("Cannot find desktop directory")?;

    // Determine backup location
    let backup_base = match backup_location {
        Some(loc) => PathBuf::from(loc),
        None => {
            // Default to Documents/Desktop_Backups
            user_dirs.document_dir()
                .ok_or("Cannot find documents directory")?
                .join("Desktop_Backups")
        }
    };

    // Create timestamped backup folder name
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let backup_folder_name = format!("Desktop_backup_{}", timestamp);
    let backup_path = backup_base.join(&backup_folder_name);

    // Create backup directory
    fs::create_dir_all(&backup_path).map_err(|e| format!("Failed to create backup directory: {}", e))?;

    let mut files_count = 0;
    let mut total_size: u64 = 0;

    // Copy all files from desktop
    for entry in WalkDir::new(&desktop_path)
        .min_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let source = entry.path();
        let relative = source.strip_prefix(&desktop_path).map_err(|e| e.to_string())?;
        let dest = backup_path.join(relative);

        if source.is_dir() {
            fs::create_dir_all(&dest).map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            // Get file size before copying
            if let Ok(metadata) = source.metadata() {
                total_size += metadata.len();
            }

            // Ensure parent directory exists
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            fs::copy(source, &dest).map_err(|e| format!("Failed to copy file {}: {}", source.display(), e))?;
            files_count += 1;
        }
    }

    Ok(BackupResult {
        backup_path: backup_path.to_string_lossy().to_string(),
        files_count,
        total_size,
    })
}

/// List existing backups
#[tauri::command]
pub fn list_backups() -> Result<Vec<BackupInfo>, String> {
    use directories::UserDirs;

    let user_dirs = UserDirs::new().ok_or("Cannot find user directories")?;
    let backup_base = user_dirs.document_dir()
        .ok_or("Cannot find documents directory")?
        .join("Desktop_Backups");

    if !backup_base.exists() {
        return Ok(vec![]);
    }

    let mut backups = Vec::new();

    for entry in fs::read_dir(&backup_base).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_dir() {
            let name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            if name.starts_with("Desktop_backup_") {
                // Calculate folder size
                let mut size: u64 = 0;
                let mut file_count = 0;

                for file_entry in walkdir::WalkDir::new(&path)
                    .into_iter()
                    .filter_map(|e| e.ok())
                {
                    if file_entry.path().is_file() {
                        if let Ok(metadata) = file_entry.metadata() {
                            size += metadata.len();
                            file_count += 1;
                        }
                    }
                }

                // Get creation time
                let created_at = entry.metadata()
                    .ok()
                    .and_then(|m| m.created().ok())
                    .map(|t| {
                        let datetime: chrono::DateTime<chrono::Local> = t.into();
                        datetime.format("%Y-%m-%d %H:%M:%S").to_string()
                    })
                    .unwrap_or_else(|| "Unknown".to_string());

                backups.push(BackupInfo {
                    name,
                    path: path.to_string_lossy().to_string(),
                    size,
                    file_count,
                    created_at,
                });
            }
        }
    }

    // Sort by name (newest first)
    backups.sort_by(|a, b| b.name.cmp(&a.name));

    Ok(backups)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub file_count: usize,
    pub created_at: String,
}

/// Restore desktop from a backup
#[tauri::command]
pub fn restore_backup(backup_path: String, db_path: State<DbPath>) -> Result<usize, String> {
    use directories::UserDirs;
    use walkdir::WalkDir;

    let user_dirs = UserDirs::new().ok_or("Cannot find user directories")?;
    let backup_dir = PathBuf::from(&backup_path);
    let desktop_path = user_dirs.desktop_dir()
        .ok_or("Cannot find desktop directory")?;

    if !backup_dir.exists() {
        return Err("Backup directory does not exist".to_string());
    }

    let mut restored_count = 0;

    for entry in WalkDir::new(&backup_dir)
        .min_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let source = entry.path();
        let relative = source.strip_prefix(&backup_dir).map_err(|e| e.to_string())?;
        let dest = desktop_path.join(relative);

        if source.is_dir() {
            fs::create_dir_all(&dest).map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            // Ensure parent directory exists
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }

            // If destination exists, rename it
            if dest.exists() {
                let unique_dest = get_unique_path(&dest);
                fs::rename(&dest, &unique_dest).map_err(|e| e.to_string())?;
            }

            fs::copy(source, &dest).map_err(|e| format!("Failed to restore file: {}", e))?;
            restored_count += 1;
        }
    }

    // Record in history
    let undo_data = serde_json::json!({
        "backup_path": backup_path,
        "restored_count": restored_count,
        "action": "restore"
    });

    database::add_history(
        &db_path.0,
        "restore",
        &format!("백업 복원: {} 파일", restored_count),
        &undo_data.to_string(),
    )?;

    Ok(restored_count)
}

/// Delete a backup folder
#[tauri::command]
pub fn delete_backup(backup_path: String) -> Result<(), String> {
    use directories::UserDirs;

    let path = PathBuf::from(&backup_path);

    if !path.exists() {
        return Err("Backup does not exist".to_string());
    }

    // Safety check: only delete from Desktop_Backups folder
    let user_dirs = UserDirs::new().ok_or("Cannot find user directories")?;
    let backup_base = user_dirs.document_dir()
        .ok_or("Cannot find documents directory")?
        .join("Desktop_Backups");

    if !path.starts_with(&backup_base) {
        return Err("Can only delete backups from Desktop_Backups folder".to_string());
    }

    fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete backup: {}", e))?;

    Ok(())
}
