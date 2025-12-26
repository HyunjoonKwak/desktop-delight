use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;
use xxhash_rust::xxh3::xxh3_64;

use crate::commands::scanner::FileInfo;
use crate::services::classifier::classify_extension;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderStats {
    pub path: String,
    pub total_size: u64,
    pub total_size_formatted: String,
    pub file_count: usize,
    pub folder_count: usize,
    pub largest_file: Option<FileInfo>,
    pub category_breakdown: HashMap<String, CategoryStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryStats {
    pub count: usize,
    pub total_size: u64,
    pub total_size_formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub hash: String,
    pub size: u64,
    pub size_formatted: String,
    pub files: Vec<FileInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderTreeNode {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub size_formatted: String,
    pub file_count: usize,
    pub children: Vec<FolderTreeNode>,
}

/// Analyze a folder and return statistics
#[tauri::command]
pub fn analyze_folder(path: String) -> Result<FolderStats, String> {
    let folder_path = PathBuf::from(&path);

    if !folder_path.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    let mut total_size: u64 = 0;
    let mut file_count: usize = 0;
    let mut folder_count: usize = 0;
    let mut largest_file: Option<FileInfo> = None;
    let mut largest_size: u64 = 0;
    let mut category_breakdown: HashMap<String, CategoryStats> = HashMap::new();

    for entry in WalkDir::new(&folder_path)
        .min_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();

        if entry_path.is_dir() {
            folder_count += 1;
            continue;
        }

        if let Ok(metadata) = fs::metadata(entry_path) {
            let size = metadata.len();
            total_size += size;
            file_count += 1;

            // Track largest file
            if size > largest_size {
                largest_size = size;
                let extension = entry_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| format!(".{}", e.to_lowercase()))
                    .unwrap_or_default();

                let category = classify_extension(&extension);

                largest_file = Some(FileInfo {
                    path: entry_path.to_string_lossy().to_string(),
                    name: entry_path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string(),
                    extension,
                    size,
                    size_formatted: format_size(size),
                    created_at: get_time(&metadata, true),
                    modified_at: get_time(&metadata, false),
                    is_directory: false,
                    is_hidden: entry_path.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with('.'))
                        .unwrap_or(false),
                    category,
                });
            }

            // Update category breakdown
            let extension = entry_path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| format!(".{}", e.to_lowercase()))
                .unwrap_or_default();

            let category = classify_extension(&extension);
            let category_name = format!("{:?}", category).to_lowercase();

            let stats = category_breakdown.entry(category_name).or_insert(CategoryStats {
                count: 0,
                total_size: 0,
                total_size_formatted: String::new(),
            });
            stats.count += 1;
            stats.total_size += size;
        }
    }

    // Format sizes in category breakdown
    for stats in category_breakdown.values_mut() {
        stats.total_size_formatted = format_size(stats.total_size);
    }

    Ok(FolderStats {
        path,
        total_size,
        total_size_formatted: format_size(total_size),
        file_count,
        folder_count,
        largest_file,
        category_breakdown,
    })
}

/// Find duplicate files in a folder using xxHash
#[tauri::command]
pub fn find_duplicates(path: String) -> Result<Vec<DuplicateGroup>, String> {
    let folder_path = PathBuf::from(&path);

    if !folder_path.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    // Group files by size first (optimization)
    let mut size_groups: HashMap<u64, Vec<PathBuf>> = HashMap::new();

    for entry in WalkDir::new(&folder_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();

        if !entry_path.is_file() {
            continue;
        }

        if let Ok(metadata) = fs::metadata(entry_path) {
            let size = metadata.len();
            if size > 0 {
                size_groups.entry(size).or_default().push(entry_path.to_path_buf());
            }
        }
    }

    // Hash files with same size
    let mut hash_groups: HashMap<String, Vec<PathBuf>> = HashMap::new();

    for (_size, paths) in size_groups.iter().filter(|(_, paths)| paths.len() > 1) {
        for path in paths {
            if let Ok(hash) = compute_file_hash(path) {
                hash_groups.entry(hash).or_default().push(path.clone());
            }
        }
    }

    // Build duplicate groups
    let mut duplicates: Vec<DuplicateGroup> = Vec::new();

    for (hash, paths) in hash_groups.into_iter().filter(|(_, paths)| paths.len() > 1) {
        let first_path = &paths[0];
        let size = fs::metadata(first_path).map(|m| m.len()).unwrap_or(0);

        let files: Vec<FileInfo> = paths
            .iter()
            .filter_map(|p| {
                let metadata = fs::metadata(p).ok()?;
                let extension = p
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| format!(".{}", e.to_lowercase()))
                    .unwrap_or_default();

                let category = classify_extension(&extension);

                Some(FileInfo {
                    path: p.to_string_lossy().to_string(),
                    name: p.file_name()?.to_str()?.to_string(),
                    extension,
                    size: metadata.len(),
                    size_formatted: format_size(metadata.len()),
                    created_at: get_time(&metadata, true),
                    modified_at: get_time(&metadata, false),
                    is_directory: false,
                    is_hidden: p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with('.'))
                        .unwrap_or(false),
                    category,
                })
            })
            .collect();

        duplicates.push(DuplicateGroup {
            hash,
            size,
            size_formatted: format_size(size),
            files,
        });
    }

    // Sort by wasted space (size * (count - 1))
    duplicates.sort_by(|a, b| {
        let waste_a = a.size * (a.files.len() as u64 - 1);
        let waste_b = b.size * (b.files.len() as u64 - 1);
        waste_b.cmp(&waste_a)
    });

    Ok(duplicates)
}

/// Find empty folders
#[tauri::command]
pub fn find_empty_folders(path: String) -> Result<Vec<String>, String> {
    let folder_path = PathBuf::from(&path);

    if !folder_path.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    let mut empty_folders: Vec<String> = Vec::new();

    for entry in WalkDir::new(&folder_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();

        if entry_path.is_dir() {
            if let Ok(mut entries) = fs::read_dir(entry_path) {
                if entries.next().is_none() {
                    empty_folders.push(entry_path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(empty_folders)
}

/// Find large files over a size threshold
#[tauri::command]
pub fn find_large_files(
    path: String,
    threshold_mb: u64,
) -> Result<Vec<FileInfo>, String> {
    let folder_path = PathBuf::from(&path);
    let threshold_bytes = threshold_mb * 1024 * 1024;

    if !folder_path.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    let mut large_files: Vec<FileInfo> = Vec::new();

    for entry in WalkDir::new(&folder_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();

        if !entry_path.is_file() {
            continue;
        }

        if let Ok(metadata) = fs::metadata(entry_path) {
            let size = metadata.len();
            if size >= threshold_bytes {
                let extension = entry_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| format!(".{}", e.to_lowercase()))
                    .unwrap_or_default();

                let category = classify_extension(&extension);

                large_files.push(FileInfo {
                    path: entry_path.to_string_lossy().to_string(),
                    name: entry_path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string(),
                    extension,
                    size,
                    size_formatted: format_size(size),
                    created_at: get_time(&metadata, true),
                    modified_at: get_time(&metadata, false),
                    is_directory: false,
                    is_hidden: entry_path.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with('.'))
                        .unwrap_or(false),
                    category,
                });
            }
        }
    }

    // Sort by size descending
    large_files.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(large_files)
}

/// Get folder tree structure
#[tauri::command]
pub fn get_folder_tree(path: String, max_depth: u32) -> Result<FolderTreeNode, String> {
    let folder_path = PathBuf::from(&path);

    if !folder_path.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    fn build_tree(path: &PathBuf, current_depth: u32, max_depth: u32) -> Option<FolderTreeNode> {
        if !path.is_dir() || current_depth > max_depth {
            return None;
        }

        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let mut total_size: u64 = 0;
        let mut file_count: usize = 0;
        let mut children: Vec<FolderTreeNode> = Vec::new();

        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let entry_path = entry.path();

                if entry_path.is_dir() {
                    if let Some(child) = build_tree(&entry_path, current_depth + 1, max_depth) {
                        total_size += child.size;
                        file_count += child.file_count;
                        children.push(child);
                    }
                } else if let Ok(metadata) = fs::metadata(&entry_path) {
                    total_size += metadata.len();
                    file_count += 1;
                }
            }
        }

        // Sort children by size descending
        children.sort_by(|a, b| b.size.cmp(&a.size));

        Some(FolderTreeNode {
            path: path.to_string_lossy().to_string(),
            name,
            size: total_size,
            size_formatted: format_size(total_size),
            file_count,
            children,
        })
    }

    build_tree(&folder_path, 0, max_depth).ok_or_else(|| "Failed to build folder tree".to_string())
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

fn get_time(metadata: &fs::Metadata, created: bool) -> String {
    let time = if created {
        metadata.created().ok()
    } else {
        metadata.modified().ok()
    };

    time.map(|t| {
        let datetime: chrono::DateTime<chrono::Local> = t.into();
        datetime.format("%Y-%m-%d %H:%M:%S").to_string()
    })
    .unwrap_or_else(|| "Unknown".to_string())
}

fn compute_file_hash(path: &PathBuf) -> Result<String, std::io::Error> {
    // Read first and last 64KB for quick hash (optimization for large files)
    let file = fs::File::open(path)?;
    let metadata = file.metadata()?;
    let file_size = metadata.len();

    use std::io::Read;
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

    // Include file size in hash to differentiate files with same content at boundaries
    hasher_data.extend_from_slice(&file_size.to_le_bytes());

    let hash = xxh3_64(&hasher_data);
    Ok(format!("{:016x}", hash))
}
