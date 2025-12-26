use std::path::PathBuf;
use tauri::{AppHandle, State};

use crate::services::watcher::WatcherState;

#[tauri::command]
pub fn start_watching(
    watcher_state: State<WatcherState>,
    app_handle: AppHandle,
    path: String,
) -> Result<(), String> {
    let mut watcher = watcher_state.0.lock().map_err(|e| e.to_string())?;
    let path_buf = PathBuf::from(path);

    if !path_buf.exists() {
        return Err("경로가 존재하지 않습니다".to_string());
    }

    watcher.start_watching(path_buf, app_handle)?;
    Ok(())
}

#[tauri::command]
pub fn stop_watching(watcher_state: State<WatcherState>) -> Result<(), String> {
    let mut watcher = watcher_state.0.lock().map_err(|e| e.to_string())?;
    watcher.stop_watching();
    Ok(())
}

#[tauri::command]
pub fn is_watching(watcher_state: State<WatcherState>) -> Result<bool, String> {
    let watcher = watcher_state.0.lock().map_err(|e| e.to_string())?;
    Ok(watcher.is_watching())
}

#[tauri::command]
pub fn get_watching_path(watcher_state: State<WatcherState>) -> Result<Option<String>, String> {
    let watcher = watcher_state.0.lock().map_err(|e| e.to_string())?;
    Ok(watcher.get_watching_path().map(|p| p.to_string_lossy().to_string()))
}
