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
        (".hwpx", "documents", "Documents"),
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn create_test_db() -> (PathBuf, tempfile::TempDir) {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        init_database(&db_path).unwrap();
        (db_path, dir)
    }

    #[test]
    fn test_init_database() {
        let (db_path, _dir) = create_test_db();
        assert!(db_path.exists());

        // Verify tables exist
        let conn = Connection::open(&db_path).unwrap();
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(Result::ok)
            .collect();

        assert!(tables.contains(&"settings".to_string()));
        assert!(tables.contains(&"rules".to_string()));
        assert!(tables.contains(&"extension_mappings".to_string()));
        assert!(tables.contains(&"exclusions".to_string()));
        assert!(tables.contains(&"history".to_string()));
    }

    #[test]
    fn test_default_extension_mappings() {
        let (db_path, _dir) = create_test_db();
        let conn = Connection::open(&db_path).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM extension_mappings", [], |row| row.get(0))
            .unwrap();

        // Should have default mappings
        assert!(count > 0);

        // Verify some specific mappings
        let category: String = conn
            .query_row(
                "SELECT category FROM extension_mappings WHERE extension = '.jpg'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(category, "images");

        let category: String = conn
            .query_row(
                "SELECT category FROM extension_mappings WHERE extension = '.pdf'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(category, "documents");
    }

    #[test]
    fn test_set_and_get_setting() {
        let (db_path, _dir) = create_test_db();

        // Set a setting
        set_setting(&db_path, "test_key", "test_value").unwrap();

        // Get the setting
        let value = get_setting(&db_path, "test_key").unwrap();
        assert_eq!(value, Some("test_value".to_string()));

        // Get non-existent setting
        let value = get_setting(&db_path, "non_existent").unwrap();
        assert_eq!(value, None);
    }

    #[test]
    fn test_update_setting() {
        let (db_path, _dir) = create_test_db();

        // Set initial value
        set_setting(&db_path, "key", "value1").unwrap();
        assert_eq!(get_setting(&db_path, "key").unwrap(), Some("value1".to_string()));

        // Update value
        set_setting(&db_path, "key", "value2").unwrap();
        assert_eq!(get_setting(&db_path, "key").unwrap(), Some("value2".to_string()));
    }

    #[test]
    fn test_get_all_settings() {
        let (db_path, _dir) = create_test_db();

        set_setting(&db_path, "key1", "value1").unwrap();
        set_setting(&db_path, "key2", "value2").unwrap();
        set_setting(&db_path, "key3", "value3").unwrap();

        let settings = get_all_settings(&db_path).unwrap();

        assert_eq!(settings.get("key1"), Some(&"value1".to_string()));
        assert_eq!(settings.get("key2"), Some(&"value2".to_string()));
        assert_eq!(settings.get("key3"), Some(&"value3".to_string()));
    }

    #[test]
    fn test_add_and_get_history() {
        let (db_path, _dir) = create_test_db();

        // Add history items
        let id1 = add_history(&db_path, "move", "Moved file.txt", r#"{"from": "/a", "to": "/b"}"#).unwrap();
        let id2 = add_history(&db_path, "delete", "Deleted file2.txt", r#"{"path": "/a/file2.txt"}"#).unwrap();

        assert!(id1 > 0);
        assert!(id2 > id1);

        // Get history
        let history = get_history(&db_path, 10, 0).unwrap();
        assert_eq!(history.len(), 2);

        // History should be in reverse chronological order
        assert_eq!(history[0].id, id2);
        assert_eq!(history[1].id, id1);
    }

    #[test]
    fn test_get_history_item() {
        let (db_path, _dir) = create_test_db();

        let id = add_history(&db_path, "rename", "Renamed file", r#"{"old": "a.txt", "new": "b.txt"}"#).unwrap();

        let item = get_history_item(&db_path, id).unwrap();

        assert_eq!(item.id, id);
        assert_eq!(item.operation_type, "rename");
        assert_eq!(item.description, "Renamed file");
        assert!(!item.is_undone);
    }

    #[test]
    fn test_mark_history_undone() {
        let (db_path, _dir) = create_test_db();

        let id = add_history(&db_path, "move", "Moved file", "{}").unwrap();

        // Initially not undone
        let item = get_history_item(&db_path, id).unwrap();
        assert!(!item.is_undone);

        // Mark as undone
        mark_history_undone(&db_path, id).unwrap();

        let item = get_history_item(&db_path, id).unwrap();
        assert!(item.is_undone);
    }

    #[test]
    fn test_clear_history() {
        let (db_path, _dir) = create_test_db();

        add_history(&db_path, "move", "Moved file1", "{}").unwrap();
        add_history(&db_path, "move", "Moved file2", "{}").unwrap();
        add_history(&db_path, "move", "Moved file3", "{}").unwrap();

        let history = get_history(&db_path, 10, 0).unwrap();
        assert_eq!(history.len(), 3);

        clear_history(&db_path).unwrap();

        let history = get_history(&db_path, 10, 0).unwrap();
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_history_pagination() {
        let (db_path, _dir) = create_test_db();

        // Add 5 history items
        for i in 1..=5 {
            add_history(&db_path, "move", &format!("Moved file{}", i), "{}").unwrap();
        }

        // Test limit
        let history = get_history(&db_path, 2, 0).unwrap();
        assert_eq!(history.len(), 2);

        // Test offset
        let history = get_history(&db_path, 2, 2).unwrap();
        assert_eq!(history.len(), 2);

        // Test offset beyond available
        let history = get_history(&db_path, 10, 10).unwrap();
        assert_eq!(history.len(), 0);
    }
}
