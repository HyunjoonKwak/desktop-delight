use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::State;

use crate::commands::scanner::FileInfo;
use crate::database::DbPath;
use crate::services::classifier::{classify_extension, get_category_folder, FileCategory};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizePreview {
    pub category: String,
    pub category_label: String,
    pub files: Vec<FileInfo>,
    pub destination_folder: String,
    pub file_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizeOptions {
    pub create_date_subfolders: bool,
    pub date_format: String,
    pub handle_duplicates: String, // "overwrite", "rename", "skip"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizeResult {
    pub success: bool,
    pub files_moved: usize,
    pub files_skipped: usize,
    pub errors: Vec<String>,
    pub history_id: i64,
}

/// Preview organization - shows what will happen without actually moving files
#[tauri::command]
pub fn preview_organization(
    source_path: String,
) -> Result<Vec<OrganizePreview>, String> {
    let source = PathBuf::from(&source_path);

    if !source.exists() {
        return Err("소스 경로가 존재하지 않습니다".to_string());
    }

    let mut categories: HashMap<FileCategory, Vec<FileInfo>> = HashMap::new();

    // Read directory entries
    let entries = fs::read_dir(&source).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();

        // Skip directories and hidden files
        if path.is_dir() {
            continue;
        }

        let file_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if file_name.starts_with('.') {
            continue;
        }

        let extension = path.extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        let category = classify_extension(&extension);

        let metadata = fs::metadata(&path).ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

        let file_info = FileInfo {
            path: path.to_string_lossy().to_string(),
            name: file_name,
            extension,
            size,
            size_formatted: format_size(size),
            created_at: get_created_time(&metadata),
            modified_at: get_modified_time(&metadata),
            is_directory: false,
            is_hidden: false,
            category: category.clone(),
        };

        categories.entry(category).or_default().push(file_info);
    }

    // Convert to preview format
    let mut previews: Vec<OrganizePreview> = categories
        .into_iter()
        .map(|(category, files)| {
            let folder_name = get_category_folder(&category);
            let dest_path = source.join(folder_name);
            let file_count = files.len();

            OrganizePreview {
                category: format!("{:?}", category).to_lowercase(),
                category_label: get_category_korean_label(&category),
                files,
                destination_folder: dest_path.to_string_lossy().to_string(),
                file_count,
            }
        })
        .filter(|p| p.file_count > 0)
        .collect();

    // Sort by file count descending
    previews.sort_by(|a, b| b.file_count.cmp(&a.file_count));

    Ok(previews)
}

/// Execute organization - actually move files
#[tauri::command]
pub fn execute_organization(
    db_state: State<DbPath>,
    source_path: String,
    options: OrganizeOptions,
) -> Result<OrganizeResult, String> {
    let source = PathBuf::from(&source_path);
    let db_path = &db_state.0;

    if !source.exists() {
        return Err("소스 경로가 존재하지 않습니다".to_string());
    }

    let mut files_moved = 0;
    let mut files_skipped = 0;
    let mut errors: Vec<String> = Vec::new();
    let mut move_details: Vec<(String, String)> = Vec::new();

    // Read directory entries
    let entries = fs::read_dir(&source).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();

        // Skip directories and hidden files
        if path.is_dir() {
            continue;
        }

        let file_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if file_name.starts_with('.') {
            continue;
        }

        let extension = path.extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        let category = classify_extension(&extension);
        let folder_name = get_category_folder(&category);

        // Create destination folder
        let mut dest_folder = source.join(folder_name);

        // Optionally create date subfolder
        if options.create_date_subfolders {
            let metadata = fs::metadata(&path).ok();
            let date_folder = get_date_folder(&metadata, &options.date_format);
            dest_folder = dest_folder.join(date_folder);
        }

        if let Err(e) = fs::create_dir_all(&dest_folder) {
            errors.push(format!("폴더 생성 실패 {}: {}", dest_folder.display(), e));
            continue;
        }

        // Determine destination file path
        let mut dest_path = dest_folder.join(&file_name);

        // Handle duplicates
        if dest_path.exists() {
            match options.handle_duplicates.as_str() {
                "skip" => {
                    files_skipped += 1;
                    continue;
                }
                "rename" => {
                    dest_path = get_unique_path(&dest_path);
                }
                "overwrite" => {
                    // Will overwrite
                }
                _ => {
                    files_skipped += 1;
                    continue;
                }
            }
        }

        // Move the file
        match fs::rename(&path, &dest_path) {
            Ok(_) => {
                move_details.push((
                    path.to_string_lossy().to_string(),
                    dest_path.to_string_lossy().to_string(),
                ));
                files_moved += 1;
            }
            Err(e) => {
                // Try copy + delete if rename fails (cross-device)
                match fs::copy(&path, &dest_path) {
                    Ok(_) => {
                        if let Err(del_err) = fs::remove_file(&path) {
                            errors.push(format!("원본 삭제 실패 {}: {}", file_name, del_err));
                        }
                        move_details.push((
                            path.to_string_lossy().to_string(),
                            dest_path.to_string_lossy().to_string(),
                        ));
                        files_moved += 1;
                    }
                    Err(copy_err) => {
                        errors.push(format!("파일 이동 실패 {}: {}", file_name, copy_err));
                    }
                }
            }
        }
    }

    // Record history
    let details_json = serde_json::to_string(&move_details).unwrap_or_default();
    let history_id = crate::database::add_history(
        db_path,
        "organize",
        &format!("바탕화면 자동 정리: {}개 파일 이동", files_moved),
        &details_json,
    ).unwrap_or(-1);

    Ok(OrganizeResult {
        success: errors.is_empty(),
        files_moved,
        files_skipped,
        errors,
        history_id,
    })
}

// Helper functions
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

fn get_created_time(metadata: &Option<fs::Metadata>) -> String {
    metadata
        .as_ref()
        .and_then(|m| m.created().ok())
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Local> = t.into();
            datetime.format("%Y-%m-%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|| "Unknown".to_string())
}

fn get_modified_time(metadata: &Option<fs::Metadata>) -> String {
    metadata
        .as_ref()
        .and_then(|m| m.modified().ok())
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Local> = t.into();
            datetime.format("%Y-%m-%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|| "Unknown".to_string())
}

fn get_date_folder(metadata: &Option<fs::Metadata>, format: &str) -> String {
    metadata
        .as_ref()
        .and_then(|m| m.modified().ok())
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Local> = t.into();
            match format {
                "YYYY-MM" => datetime.format("%Y-%m").to_string(),
                "YYYY/MM" => datetime.format("%Y/%m").to_string(),
                "YYYY" => datetime.format("%Y").to_string(),
                _ => datetime.format("%Y-%m-%d").to_string(),
            }
        })
        .unwrap_or_else(|| "Unknown".to_string())
}

fn get_unique_path(path: &PathBuf) -> PathBuf {
    let stem = path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file");
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    let parent = path.parent().unwrap_or(path);

    let mut counter = 1;
    loop {
        let new_name = if extension.is_empty() {
            format!("{} ({})", stem, counter)
        } else {
            format!("{} ({}).{}", stem, counter, extension)
        };
        let new_path = parent.join(new_name);
        if !new_path.exists() {
            return new_path;
        }
        counter += 1;
    }
}

fn get_category_korean_label(category: &FileCategory) -> String {
    match category {
        FileCategory::Images => "이미지".to_string(),
        FileCategory::Documents => "문서".to_string(),
        FileCategory::Videos => "동영상".to_string(),
        FileCategory::Music => "음악".to_string(),
        FileCategory::Archives => "압축파일".to_string(),
        FileCategory::Installers => "설치파일".to_string(),
        FileCategory::Code => "코드".to_string(),
        FileCategory::Others => "기타".to_string(),
    }
}
