mod commands;
mod database;
mod services;

use services::watcher::WatcherState;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, Runtime,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Initialize database
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;

            let db_path = app_data_dir.join("data.db");
            database::init_database(&db_path)?;

            // Store database path in app state
            app.manage(database::DbPath(db_path));

            // Initialize file watcher state
            app.manage(WatcherState::new());

            // Setup logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Setup system tray
            let show_item = MenuItem::with_id(app, "show", "열기", true, None::<&str>)?;
            let organize_item = MenuItem::with_id(app, "organize", "바탕화면 정리", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &organize_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Desktop Organizer Pro")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = tauri::WebviewWindow::show(&window);
                                let _ = tauri::WebviewWindow::set_focus(&window);
                            }
                        }
                        "organize" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = tauri::Emitter::emit(&window, "tray-organize", ());
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = tauri::WebviewWindow::show(&window);
                            let _ = tauri::WebviewWindow::set_focus(&window);
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Scanner commands
            commands::scanner::scan_desktop,
            commands::scanner::scan_directory,
            commands::scanner::get_file_info,
            commands::scanner::get_desktop_path,
            // File operations
            commands::file_ops::move_file,
            commands::file_ops::copy_file,
            commands::file_ops::delete_file,
            commands::file_ops::rename_file,
            commands::file_ops::create_folder,
            // Backup commands
            commands::file_ops::backup_desktop,
            commands::file_ops::list_backups,
            commands::file_ops::restore_backup,
            commands::file_ops::delete_backup,
            // Organizer commands
            commands::organizer::preview_organization,
            commands::organizer::execute_organization,
            // Renamer commands
            commands::renamer::preview_rename,
            commands::renamer::execute_rename,
            // Settings
            commands::settings::get_settings,
            commands::settings::update_settings,
            // History
            commands::history::get_history,
            commands::history::undo_operation,
            commands::history::clear_history,
            // Analyzer commands
            commands::analyzer::analyze_folder,
            commands::analyzer::find_duplicates,
            commands::analyzer::find_empty_folders,
            commands::analyzer::find_large_files,
            commands::analyzer::get_folder_tree,
            // Rules commands
            commands::rules::get_rules,
            commands::rules::save_rule,
            commands::rules::delete_rule,
            commands::rules::preview_rules,
            commands::rules::execute_rules,
            // Watcher commands
            commands::watcher::start_watching,
            commands::watcher::stop_watching,
            commands::watcher::is_watching,
            commands::watcher::get_watching_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
