use serde::{Deserialize, Serialize};
use tauri::State;

use crate::database::{self, DbPath};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub desktop_path: String,
    pub language: String,
    pub theme: String,
    pub enable_watcher: bool,
    pub auto_organize_on_startup: bool,
    pub default_date_format: String,
    pub show_hidden_files: bool,
    pub confirm_before_delete: bool,
    pub use_trash: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        let desktop_path = directories::UserDirs::new()
            .and_then(|dirs| dirs.desktop_dir().map(|p| p.to_string_lossy().to_string()))
            .unwrap_or_default();

        Self {
            desktop_path,
            language: "ko".to_string(),
            theme: "dark".to_string(),
            enable_watcher: false,
            auto_organize_on_startup: false,
            default_date_format: "YYYY-MM".to_string(),
            show_hidden_files: false,
            confirm_before_delete: true,
            use_trash: true,
        }
    }
}

#[tauri::command]
pub fn get_settings(db_path: State<DbPath>) -> Result<AppSettings, String> {
    let settings = database::get_all_settings(&db_path.0)?;
    let default = AppSettings::default();

    Ok(AppSettings {
        desktop_path: settings
            .get("desktop_path")
            .cloned()
            .unwrap_or(default.desktop_path),
        language: settings
            .get("language")
            .cloned()
            .unwrap_or(default.language),
        theme: settings.get("theme").cloned().unwrap_or(default.theme),
        enable_watcher: settings
            .get("enable_watcher")
            .map(|v| v == "true")
            .unwrap_or(default.enable_watcher),
        auto_organize_on_startup: settings
            .get("auto_organize_on_startup")
            .map(|v| v == "true")
            .unwrap_or(default.auto_organize_on_startup),
        default_date_format: settings
            .get("default_date_format")
            .cloned()
            .unwrap_or(default.default_date_format),
        show_hidden_files: settings
            .get("show_hidden_files")
            .map(|v| v == "true")
            .unwrap_or(default.show_hidden_files),
        confirm_before_delete: settings
            .get("confirm_before_delete")
            .map(|v| v == "true")
            .unwrap_or(default.confirm_before_delete),
        use_trash: settings
            .get("use_trash")
            .map(|v| v == "true")
            .unwrap_or(default.use_trash),
    })
}

#[tauri::command]
pub fn update_settings(
    settings: std::collections::HashMap<String, String>,
    db_path: State<DbPath>,
) -> Result<AppSettings, String> {
    for (key, value) in settings {
        database::set_setting(&db_path.0, &key, &value)?;
    }

    get_settings(db_path)
}
