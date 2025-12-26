use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;
use xxhash_rust::xxh3::xxh3_64;

use crate::commands::scanner::FileInfo;
use crate::services::classifier::classify_extension;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FileStatus {
    OnlyInSource,
    OnlyInTarget,
    Identical,
    Different,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareResult {
    pub relative_path: String,
    pub status: FileStatus,
    pub source_file: Option<FileInfo>,
    pub target_file: Option<FileInfo>,
    pub size_diff: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareSummary {
    pub source_path: String,
    pub target_path: String,
    pub total_files: usize,
    pub only_in_source: usize,
    pub only_in_target: usize,
    pub identical: usize,
    pub different: usize,
    pub source_total_size: u64,
    pub target_total_size: u64,
    pub results: Vec<CompareResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MergeStrategy {
    SkipExisting,
    OverwriteAll,
    OverwriteNewer,
    OverwriteOlder,
    Rename,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeOptions {
    pub strategy: MergeStrategy,
    pub delete_source_after: bool,
    pub include_only_in_source: bool,
    pub include_different: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeResult {
    pub success: bool,
    pub files_copied: usize,
    pub files_skipped: usize,
    pub files_overwritten: usize,
    pub bytes_transferred: u64,
    pub errors: Vec<String>,
}

/// Compare two folders and return differences
#[tauri::command]
pub fn compare_folders(source_path: String, target_path: String) -> Result<CompareSummary, String> {
    let source = PathBuf::from(&source_path);
    let target = PathBuf::from(&target_path);

    if !source.exists() {
        return Err("소스 폴더가 존재하지 않습니다".to_string());
    }
    if !target.exists() {
        return Err("대상 폴더가 존재하지 않습니다".to_string());
    }

    // Collect files from source
    let mut source_files: HashMap<String, (PathBuf, u64, String)> = HashMap::new();
    let mut source_total_size: u64 = 0;

    for entry in WalkDir::new(&source)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        if let Ok(metadata) = fs::metadata(path) {
            let relative = path.strip_prefix(&source)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            let size = metadata.len();
            source_total_size += size;

            let hash = compute_file_hash(path).unwrap_or_default();
            source_files.insert(relative, (path.to_path_buf(), size, hash));
        }
    }

    // Collect files from target
    let mut target_files: HashMap<String, (PathBuf, u64, String)> = HashMap::new();
    let mut target_total_size: u64 = 0;

    for entry in WalkDir::new(&target)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        if let Ok(metadata) = fs::metadata(path) {
            let relative = path.strip_prefix(&target)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            let size = metadata.len();
            target_total_size += size;

            let hash = compute_file_hash(path).unwrap_or_default();
            target_files.insert(relative, (path.to_path_buf(), size, hash));
        }
    }

    // Compare files
    let mut results: Vec<CompareResult> = Vec::new();
    let mut only_in_source = 0;
    let mut only_in_target = 0;
    let mut identical = 0;
    let mut different = 0;

    // Check source files
    for (relative, (path, size, hash)) in &source_files {
        if let Some((target_path, target_size, target_hash)) = target_files.get(relative) {
            let status = if hash == target_hash {
                identical += 1;
                FileStatus::Identical
            } else {
                different += 1;
                FileStatus::Different
            };

            results.push(CompareResult {
                relative_path: relative.clone(),
                status,
                source_file: Some(create_file_info(path, *size)),
                target_file: Some(create_file_info(target_path, *target_size)),
                size_diff: *size as i64 - *target_size as i64,
            });
        } else {
            only_in_source += 1;
            results.push(CompareResult {
                relative_path: relative.clone(),
                status: FileStatus::OnlyInSource,
                source_file: Some(create_file_info(path, *size)),
                target_file: None,
                size_diff: *size as i64,
            });
        }
    }

    // Check target-only files
    for (relative, (path, size, _)) in &target_files {
        if !source_files.contains_key(relative) {
            only_in_target += 1;
            results.push(CompareResult {
                relative_path: relative.clone(),
                status: FileStatus::OnlyInTarget,
                source_file: None,
                target_file: Some(create_file_info(path, *size)),
                size_diff: -(*size as i64),
            });
        }
    }

    // Sort by relative path
    results.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));

    Ok(CompareSummary {
        source_path,
        target_path,
        total_files: results.len(),
        only_in_source,
        only_in_target,
        identical,
        different,
        source_total_size,
        target_total_size,
        results,
    })
}

/// Merge folders based on options
#[tauri::command]
pub fn merge_folders(
    source_path: String,
    target_path: String,
    options: MergeOptions,
) -> Result<MergeResult, String> {
    let source = PathBuf::from(&source_path);
    let target = PathBuf::from(&target_path);

    if !source.exists() {
        return Err("소스 폴더가 존재하지 않습니다".to_string());
    }
    if !target.exists() {
        // Create target directory if it doesn't exist
        fs::create_dir_all(&target).map_err(|e| format!("대상 폴더 생성 실패: {}", e))?;
    }

    let comparison = compare_folders(source_path.clone(), target_path.clone())?;

    let mut files_copied = 0;
    let mut files_skipped = 0;
    let mut files_overwritten = 0;
    let mut bytes_transferred: u64 = 0;
    let mut errors: Vec<String> = Vec::new();

    for result in &comparison.results {
        let should_copy = match result.status {
            FileStatus::OnlyInSource => options.include_only_in_source,
            FileStatus::Different => options.include_different,
            FileStatus::Identical => false,
            FileStatus::OnlyInTarget => false,
        };

        if !should_copy {
            if result.status == FileStatus::Identical || result.status == FileStatus::OnlyInTarget {
                files_skipped += 1;
            }
            continue;
        }

        let source_file = match &result.source_file {
            Some(f) => f,
            None => continue,
        };

        let target_file_path = target.join(&result.relative_path);

        // Check if target exists and apply strategy
        let should_overwrite = if target_file_path.exists() {
            match options.strategy {
                MergeStrategy::SkipExisting => {
                    files_skipped += 1;
                    false
                }
                MergeStrategy::OverwriteAll => true,
                MergeStrategy::OverwriteNewer => {
                    let source_modified = fs::metadata(&source_file.path)
                        .and_then(|m| m.modified())
                        .ok();
                    let target_modified = fs::metadata(&target_file_path)
                        .and_then(|m| m.modified())
                        .ok();

                    match (source_modified, target_modified) {
                        (Some(s), Some(t)) => s > t,
                        _ => false,
                    }
                }
                MergeStrategy::OverwriteOlder => {
                    let source_modified = fs::metadata(&source_file.path)
                        .and_then(|m| m.modified())
                        .ok();
                    let target_modified = fs::metadata(&target_file_path)
                        .and_then(|m| m.modified())
                        .ok();

                    match (source_modified, target_modified) {
                        (Some(s), Some(t)) => s < t,
                        _ => false,
                    }
                }
                MergeStrategy::Rename => {
                    // Generate unique name and copy
                    let new_path = generate_unique_path(&target_file_path);
                    let source_path_buf = PathBuf::from(&source_file.path);
                    if let Err(e) = copy_file_with_parents(&source_path_buf, &new_path) {
                        errors.push(format!("{}: {}", result.relative_path, e));
                    } else {
                        files_copied += 1;
                        bytes_transferred += source_file.size;
                    }
                    false // Don't overwrite original
                }
            }
        } else {
            true // Target doesn't exist, copy
        };

        if should_overwrite || !target_file_path.exists() {
            match copy_file_with_parents(&PathBuf::from(&source_file.path), &target_file_path) {
                Ok(_) => {
                    if target_file_path.exists() && result.status == FileStatus::Different {
                        files_overwritten += 1;
                    } else {
                        files_copied += 1;
                    }
                    bytes_transferred += source_file.size;
                }
                Err(e) => {
                    errors.push(format!("{}: {}", result.relative_path, e));
                }
            }
        }
    }

    // Optionally delete source after merge
    if options.delete_source_after && errors.is_empty() {
        if let Err(e) = fs::remove_dir_all(&source) {
            errors.push(format!("소스 폴더 삭제 실패: {}", e));
        }
    }

    Ok(MergeResult {
        success: errors.is_empty(),
        files_copied,
        files_skipped,
        files_overwritten,
        bytes_transferred,
        errors,
    })
}

// Helper functions
fn compute_file_hash(path: &std::path::Path) -> Result<String, std::io::Error> {
    use std::io::Read;

    let file = fs::File::open(path)?;
    let metadata = file.metadata()?;
    let file_size = metadata.len();

    let mut reader = std::io::BufReader::new(file);
    let mut hasher_data = Vec::new();

    // Read first 64KB
    let mut buffer = vec![0u8; 65536.min(file_size as usize)];
    reader.read_exact(&mut buffer)?;
    hasher_data.extend_from_slice(&buffer);

    // For files larger than 128KB, also read last 64KB
    if file_size > 131072 {
        use std::io::Seek;
        reader.seek(std::io::SeekFrom::End(-65536))?;
        let mut end_buffer = vec![0u8; 65536];
        reader.read_exact(&mut end_buffer)?;
        hasher_data.extend_from_slice(&end_buffer);
    }

    hasher_data.extend_from_slice(&file_size.to_le_bytes());

    let hash = xxh3_64(&hasher_data);
    Ok(format!("{:016x}", hash))
}

fn create_file_info(path: &PathBuf, size: u64) -> FileInfo {
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_lowercase()))
        .unwrap_or_default();

    let category = classify_extension(&extension);

    let metadata = fs::metadata(path).ok();
    let created_at = metadata.as_ref()
        .and_then(|m| m.created().ok())
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Local> = t.into();
            datetime.format("%Y-%m-%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|| "Unknown".to_string());

    let modified_at = metadata.as_ref()
        .and_then(|m| m.modified().ok())
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Local> = t.into();
            datetime.format("%Y-%m-%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|| "Unknown".to_string());

    FileInfo {
        path: path.to_string_lossy().to_string(),
        name: path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string(),
        extension,
        size,
        size_formatted: format_size(size),
        created_at,
        modified_at,
        is_directory: false,
        is_hidden: path.file_name()
            .and_then(|n| n.to_str())
            .map(|n| n.starts_with('.'))
            .unwrap_or(false),
        category,
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

fn copy_file_with_parents(source: &PathBuf, target: &PathBuf) -> Result<(), String> {
    // Create parent directories
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("폴더 생성 실패: {}", e))?;
    }

    fs::copy(source, target).map_err(|e| format!("파일 복사 실패: {}", e))?;
    Ok(())
}

fn generate_unique_path(path: &PathBuf) -> PathBuf {
    let stem = path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file");
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e))
        .unwrap_or_default();
    let parent = path.parent().unwrap_or(std::path::Path::new(""));

    let mut counter = 1;
    loop {
        let new_name = format!("{}_{}{}", stem, counter, extension);
        let new_path = parent.join(new_name);
        if !new_path.exists() {
            return new_path;
        }
        counter += 1;
    }
}
