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
    fn test_classify_extension_images() {
        let image_extensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".ico", ".psd", ".ai", ".tiff", ".raw", ".heic"];
        for ext in image_extensions {
            assert_eq!(classify_extension(ext), FileCategory::Images, "Failed for {}", ext);
        }
    }

    #[test]
    fn test_classify_extension_documents() {
        let doc_extensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".hwp", ".txt", ".rtf", ".odt", ".epub"];
        for ext in doc_extensions {
            assert_eq!(classify_extension(ext), FileCategory::Documents, "Failed for {}", ext);
        }
    }

    #[test]
    fn test_classify_extension_videos() {
        let video_extensions = [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".mpeg", ".mpg", ".3gp"];
        for ext in video_extensions {
            assert_eq!(classify_extension(ext), FileCategory::Videos, "Failed for {}", ext);
        }
    }

    #[test]
    fn test_classify_extension_music() {
        let music_extensions = [".mp3", ".wav", ".flac", ".aac", ".m4a", ".wma", ".ogg", ".opus", ".aiff", ".alac"];
        for ext in music_extensions {
            assert_eq!(classify_extension(ext), FileCategory::Music, "Failed for {}", ext);
        }
    }

    #[test]
    fn test_classify_extension_archives() {
        let archive_extensions = [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".lz", ".lzma", ".cab", ".iso"];
        for ext in archive_extensions {
            assert_eq!(classify_extension(ext), FileCategory::Archives, "Failed for {}", ext);
        }
    }

    #[test]
    fn test_classify_extension_installers() {
        let installer_extensions = [".exe", ".msi", ".dmg", ".pkg", ".deb", ".rpm", ".app", ".apk", ".appx"];
        for ext in installer_extensions {
            assert_eq!(classify_extension(ext), FileCategory::Installers, "Failed for {}", ext);
        }
    }

    #[test]
    fn test_classify_extension_code() {
        let code_extensions = [".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".java", ".cpp", ".c", ".rs", ".go", ".json", ".yaml", ".yml", ".md", ".sh"];
        for ext in code_extensions {
            assert_eq!(classify_extension(ext), FileCategory::Code, "Failed for {}", ext);
        }
    }

    #[test]
    fn test_classify_extension_others() {
        let unknown_extensions = [".xyz", ".abc", ".unknown", "", ".randomext"];
        for ext in unknown_extensions {
            assert_eq!(classify_extension(ext), FileCategory::Others, "Failed for {}", ext);
        }
    }

    #[test]
    fn test_classify_extension_case_insensitive() {
        assert_eq!(classify_extension(".JPG"), FileCategory::Images);
        assert_eq!(classify_extension(".Pdf"), FileCategory::Documents);
        assert_eq!(classify_extension(".MP4"), FileCategory::Videos);
        assert_eq!(classify_extension(".Mp3"), FileCategory::Music);
        assert_eq!(classify_extension(".ZIP"), FileCategory::Archives);
        assert_eq!(classify_extension(".EXE"), FileCategory::Installers);
        assert_eq!(classify_extension(".Rs"), FileCategory::Code);
    }

    #[test]
    fn test_get_category_folder() {
        assert_eq!(get_category_folder(&FileCategory::Images), "Images");
        assert_eq!(get_category_folder(&FileCategory::Documents), "Documents");
        assert_eq!(get_category_folder(&FileCategory::Videos), "Videos");
        assert_eq!(get_category_folder(&FileCategory::Music), "Music");
        assert_eq!(get_category_folder(&FileCategory::Archives), "Archives");
        assert_eq!(get_category_folder(&FileCategory::Installers), "Installers");
        assert_eq!(get_category_folder(&FileCategory::Code), "Code");
        assert_eq!(get_category_folder(&FileCategory::Others), "Others");
    }

    #[test]
    fn test_get_category_korean_name() {
        assert_eq!(get_category_korean_name(&FileCategory::Images), "이미지");
        assert_eq!(get_category_korean_name(&FileCategory::Documents), "문서");
        assert_eq!(get_category_korean_name(&FileCategory::Videos), "동영상");
        assert_eq!(get_category_korean_name(&FileCategory::Music), "음악");
        assert_eq!(get_category_korean_name(&FileCategory::Archives), "압축파일");
        assert_eq!(get_category_korean_name(&FileCategory::Installers), "설치파일");
        assert_eq!(get_category_korean_name(&FileCategory::Code), "코드");
        assert_eq!(get_category_korean_name(&FileCategory::Others), "기타");
    }

    #[test]
    fn test_file_category_default() {
        assert_eq!(FileCategory::default(), FileCategory::Others);
    }

    #[test]
    fn test_file_category_serialization() {
        // Test that categories serialize to lowercase
        let category = FileCategory::Images;
        let serialized = serde_json::to_string(&category).unwrap();
        assert_eq!(serialized, "\"images\"");

        let category = FileCategory::Documents;
        let serialized = serde_json::to_string(&category).unwrap();
        assert_eq!(serialized, "\"documents\"");
    }

    #[test]
    fn test_file_category_deserialization() {
        // Test that lowercase strings deserialize to categories
        let deserialized: FileCategory = serde_json::from_str("\"images\"").unwrap();
        assert_eq!(deserialized, FileCategory::Images);

        let deserialized: FileCategory = serde_json::from_str("\"documents\"").unwrap();
        assert_eq!(deserialized, FileCategory::Documents);
    }
}
