use rusqlite::{Connection, Result as SqliteResult};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::commands::history::HistoryItem;

/// Database path state for Tauri
pub struct DbPath(pub PathBuf);

/// Initialize the database with required tables
pub fn init_database(db_path: &PathBuf) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute_batch(
        r#"
        -- Settings table
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Rules table
        CREATE TABLE IF NOT EXISTS rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            enabled INTEGER NOT NULL DEFAULT 1,
            conditions TEXT NOT NULL,
            condition_logic TEXT DEFAULT 'AND',
            action_type TEXT NOT NULL,
            action_destination TEXT,
            action_rename_pattern TEXT,
            create_date_subfolder INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Extension mappings table
        CREATE TABLE IF NOT EXISTS extension_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            extension TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            target_folder TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Exclusion list table
        CREATE TABLE IF NOT EXISTS exclusions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern TEXT NOT NULL,
            pattern_type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- History table for undo support
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation_type TEXT NOT NULL,
            description TEXT NOT NULL,
            details TEXT,
            files_affected INTEGER DEFAULT 1,
            is_undone INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(priority);
        CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(enabled);
        CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at);
        CREATE INDEX IF NOT EXISTS idx_history_undone ON history(is_undone);
        CREATE INDEX IF NOT EXISTS idx_extension_mappings_ext ON extension_mappings(extension);
        "#,
    )
    .map_err(|e| e.to_string())?;

    // Insert default extension mappings if table is empty
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM extension_mappings",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if count == 0 {
        insert_default_extension_mappings(&conn)?;
    }

    Ok(())
}

fn insert_default_extension_mappings(conn: &Connection) -> Result<(), String> {
    let mappings = vec![
        // Images
        (".jpg", "images", "Images"),
        (".jpeg", "images", "Images"),
        (".png", "images", "Images"),
        (".gif", "images", "Images"),
        (".bmp", "images", "Images"),
        (".svg", "images", "Images"),
        (".webp", "images", "Images"),
        (".ico", "images", "Images"),
        (".psd", "images", "Images"),
        (".ai", "images", "Images"),
        // Documents
        (".pdf", "documents", "Documents"),
        (".doc", "documents", "Documents"),
        (".docx", "documents", "Documents"),
        (".xls", "documents", "Documents"),
        (".xlsx", "documents", "Documents"),
        (".ppt", "documents", "Documents"),
        (".pptx", "documents", "Documents"),
        (".hwp", "documents", "Documents"),
        (".txt", "documents", "Documents"),
        (".rtf", "documents", "Documents"),
        (".odt", "documents", "Documents"),
        // Videos
        (".mp4", "videos", "Videos"),
        (".avi", "videos", "Videos"),
        (".mkv", "videos", "Videos"),
        (".mov", "videos", "Videos"),
        (".wmv", "videos", "Videos"),
        (".flv", "videos", "Videos"),
        (".webm", "videos", "Videos"),
        // Music
        (".mp3", "music", "Music"),
        (".wav", "music", "Music"),
        (".flac", "music", "Music"),
        (".aac", "music", "Music"),
        (".m4a", "music", "Music"),
        (".wma", "music", "Music"),
        (".ogg", "music", "Music"),
        // Archives
        (".zip", "archives", "Archives"),
        (".rar", "archives", "Archives"),
        (".7z", "archives", "Archives"),
        (".tar", "archives", "Archives"),
        (".gz", "archives", "Archives"),
        (".bz2", "archives", "Archives"),
        // Installers
        (".exe", "installers", "Installers"),
        (".msi", "installers", "Installers"),
        (".dmg", "installers", "Installers"),
        (".pkg", "installers", "Installers"),
        (".deb", "installers", "Installers"),
        (".rpm", "installers", "Installers"),
        // Code
        (".py", "code", "Code"),
        (".js", "code", "Code"),
        (".ts", "code", "Code"),
        (".tsx", "code", "Code"),
        (".jsx", "code", "Code"),
        (".html", "code", "Code"),
        (".css", "code", "Code"),
        (".java", "code", "Code"),
        (".cpp", "code", "Code"),
        (".c", "code", "Code"),
        (".h", "code", "Code"),
        (".rs", "code", "Code"),
        (".go", "code", "Code"),
        (".json", "code", "Code"),
        (".xml", "code", "Code"),
        (".yaml", "code", "Code"),
        (".yml", "code", "Code"),
        (".md", "code", "Code"),
    ];

    for (ext, category, folder) in mappings {
        conn.execute(
            "INSERT OR IGNORE INTO extension_mappings (extension, category, target_folder) VALUES (?1, ?2, ?3)",
            [ext, category, folder],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// Settings functions
pub fn get_setting(db_path: &PathBuf, key: &str) -> Result<Option<String>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let result: SqliteResult<String> =
        conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| {
            row.get(0)
        });

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn set_setting(db_path: &PathBuf, key: &str, value: &str) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        [key, value],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_all_settings(db_path: &PathBuf) -> Result<HashMap<String, String>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;

    let mut settings = HashMap::new();
    for row in rows {
        if let Ok((key, value)) = row {
            settings.insert(key, value);
        }
    }

    Ok(settings)
}

// History functions
pub fn add_history(
    db_path: &PathBuf,
    operation_type: &str,
    description: &str,
    details: &str,
) -> Result<i64, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO history (operation_type, description, details) VALUES (?1, ?2, ?3)",
        [operation_type, description, details],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

pub fn get_history(db_path: &PathBuf, limit: i32, offset: i32) -> Result<Vec<HistoryItem>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, operation_type, description, details, files_affected, is_undone, created_at
             FROM history
             ORDER BY created_at DESC
             LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([limit, offset], |row| {
            Ok(HistoryItem {
                id: row.get(0)?,
                operation_type: row.get(1)?,
                description: row.get(2)?,
                details: row.get(3)?,
                files_affected: row.get(4)?,
                is_undone: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut history = Vec::new();
    for row in rows {
        if let Ok(item) = row {
            history.push(item);
        }
    }

    Ok(history)
}

pub fn get_history_item(db_path: &PathBuf, id: i64) -> Result<HistoryItem, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, operation_type, description, details, files_affected, is_undone, created_at
         FROM history WHERE id = ?1",
        [id],
        |row| {
            Ok(HistoryItem {
                id: row.get(0)?,
                operation_type: row.get(1)?,
                description: row.get(2)?,
                details: row.get(3)?,
                files_affected: row.get(4)?,
                is_undone: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn mark_history_undone(db_path: &PathBuf, id: i64) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute("UPDATE history SET is_undone = 1 WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn clear_history(db_path: &PathBuf) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM history", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}
