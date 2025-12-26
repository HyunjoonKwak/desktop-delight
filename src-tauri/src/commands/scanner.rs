use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;

use crate::services::classifier::{classify_extension, FileCategory};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub size_formatted: String,
    pub created_at: String,
    pub modified_at: String,
    pub is_directory: bool,
    pub is_hidden: bool,
    pub category: FileCategory,
}

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.1}GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1}MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1}KB", bytes as f64 / KB as f64)
    } else {
        format!("{}B", bytes)
    }
}

fn format_time(time: SystemTime) -> String {
    use chrono::{DateTime, Local};
    let datetime: DateTime<Local> = time.into();
    datetime.format("%Y-%m-%d %H:%M").to_string()
}

fn is_hidden(path: &std::path::Path) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::MetadataExt;
        if let Ok(metadata) = path.metadata() {
            const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
            return (metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN) != 0;
        }
        false
    }

    #[cfg(not(target_os = "windows"))]
    {
        path.file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.starts_with('.'))
            .unwrap_or(false)
    }
}

fn get_file_info_internal(path: &std::path::Path) -> Result<FileInfo, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_lowercase()))
        .unwrap_or_default();

    let size = metadata.len();
    let created_at = metadata
        .created()
        .map(format_time)
        .unwrap_or_else(|_| String::new());
    let modified_at = metadata
        .modified()
        .map(format_time)
        .unwrap_or_else(|_| String::new());

    let category = classify_extension(&extension);

    Ok(FileInfo {
        path: path.to_string_lossy().to_string(),
        name,
        extension,
        size,
        size_formatted: format_size(size),
        created_at,
        modified_at,
        is_directory: metadata.is_dir(),
        is_hidden: is_hidden(path),
        category,
    })
}

#[tauri::command]
pub fn get_desktop_path() -> Result<String, String> {
    directories::UserDirs::new()
        .and_then(|dirs| dirs.desktop_dir().map(|p| p.to_string_lossy().to_string()))
        .ok_or_else(|| "Could not find desktop directory".to_string())
}

#[tauri::command]
pub fn scan_desktop() -> Result<Vec<FileInfo>, String> {
    let desktop_path = get_desktop_path()?;
    scan_directory(desktop_path, false, false)
}

#[tauri::command]
pub fn scan_directory(
    path: String,
    recursive: bool,
    include_hidden: bool,
) -> Result<Vec<FileInfo>, String> {
    let dir_path = PathBuf::from(&path);

    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut files = Vec::new();

    if recursive {
        for entry in walkdir::WalkDir::new(&dir_path)
            .min_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let entry_path = entry.path();

            if !include_hidden && is_hidden(entry_path) {
                continue;
            }

            if let Ok(info) = get_file_info_internal(entry_path) {
                files.push(info);
            }
        }
    } else {
        let entries = fs::read_dir(&dir_path).map_err(|e| e.to_string())?;

        for entry in entries.filter_map(|e| e.ok()) {
            let entry_path = entry.path();

            if !include_hidden && is_hidden(&entry_path) {
                continue;
            }

            if let Ok(info) = get_file_info_internal(&entry_path) {
                files.push(info);
            }
        }
    }

    // Sort by name
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(files)
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileInfo, String> {
    let file_path = PathBuf::from(&path);
    get_file_info_internal(&file_path)
}
