use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum FileCategory {
    Images,
    Documents,
    Videos,
    Music,
    Archives,
    Installers,
    Code,
    Others,
}

impl Default for FileCategory {
    fn default() -> Self {
        FileCategory::Others
    }
}

pub fn classify_extension(extension: &str) -> FileCategory {
    let ext = extension.to_lowercase();

    match ext.as_str() {
        // Images
        ".jpg" | ".jpeg" | ".png" | ".gif" | ".bmp" | ".svg" | ".webp" | ".ico" | ".psd"
        | ".ai" | ".tiff" | ".raw" | ".heic" => FileCategory::Images,

        // Documents
        ".pdf" | ".doc" | ".docx" | ".xls" | ".xlsx" | ".ppt" | ".pptx" | ".hwp" | ".txt"
        | ".rtf" | ".odt" | ".ods" | ".odp" | ".pages" | ".numbers" | ".key" | ".epub" => {
            FileCategory::Documents
        }

        // Videos
        ".mp4" | ".avi" | ".mkv" | ".mov" | ".wmv" | ".flv" | ".webm" | ".m4v" | ".mpeg"
        | ".mpg" | ".3gp" => FileCategory::Videos,

        // Music
        ".mp3" | ".wav" | ".flac" | ".aac" | ".m4a" | ".wma" | ".ogg" | ".opus" | ".aiff"
        | ".alac" => FileCategory::Music,

        // Archives
        ".zip" | ".rar" | ".7z" | ".tar" | ".gz" | ".bz2" | ".xz" | ".lz" | ".lzma" | ".cab"
        | ".iso" => FileCategory::Archives,

        // Installers
        ".exe" | ".msi" | ".dmg" | ".pkg" | ".deb" | ".rpm" | ".app" | ".apk" | ".appx" => {
            FileCategory::Installers
        }

        // Code
        ".py" | ".js" | ".ts" | ".tsx" | ".jsx" | ".html" | ".css" | ".scss" | ".sass"
        | ".less" | ".java" | ".cpp" | ".c" | ".h" | ".hpp" | ".cs" | ".rs" | ".go" | ".rb"
        | ".php" | ".swift" | ".kt" | ".scala" | ".json" | ".xml" | ".yaml" | ".yml" | ".toml"
        | ".md" | ".sh" | ".bash" | ".zsh" | ".ps1" | ".sql" | ".r" | ".m" | ".lua" | ".pl"
        | ".vim" | ".vue" | ".svelte" => FileCategory::Code,

        // Others
        _ => FileCategory::Others,
    }
}

pub fn get_category_folder(category: &FileCategory) -> &'static str {
    match category {
        FileCategory::Images => "Images",
        FileCategory::Documents => "Documents",
        FileCategory::Videos => "Videos",
        FileCategory::Music => "Music",
        FileCategory::Archives => "Archives",
        FileCategory::Installers => "Installers",
        FileCategory::Code => "Code",
        FileCategory::Others => "Others",
    }
}

pub fn get_category_korean_name(category: &FileCategory) -> &'static str {
    match category {
        FileCategory::Images => "이미지",
        FileCategory::Documents => "문서",
        FileCategory::Videos => "동영상",
        FileCategory::Music => "음악",
        FileCategory::Archives => "압축파일",
        FileCategory::Installers => "설치파일",
        FileCategory::Code => "코드",
        FileCategory::Others => "기타",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_extension() {
        assert_eq!(classify_extension(".jpg"), FileCategory::Images);
        assert_eq!(classify_extension(".PDF"), FileCategory::Documents);
        assert_eq!(classify_extension(".mp4"), FileCategory::Videos);
        assert_eq!(classify_extension(".mp3"), FileCategory::Music);
        assert_eq!(classify_extension(".zip"), FileCategory::Archives);
        assert_eq!(classify_extension(".exe"), FileCategory::Installers);
        assert_eq!(classify_extension(".rs"), FileCategory::Code);
        assert_eq!(classify_extension(".xyz"), FileCategory::Others);
    }
}
