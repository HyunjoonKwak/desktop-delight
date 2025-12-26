use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct FileWatcher {
    watcher: Option<RecommendedWatcher>,
    watching_path: Option<PathBuf>,
    stop_sender: Option<Sender<()>>,
}

impl FileWatcher {
    pub fn new() -> Self {
        FileWatcher {
            watcher: None,
            watching_path: None,
            stop_sender: None,
        }
    }

    pub fn start_watching(
        &mut self,
        path: PathBuf,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        // Stop existing watcher if any
        self.stop_watching();

        let (tx, rx): (Sender<Result<Event, notify::Error>>, Receiver<Result<Event, notify::Error>>) = channel();
        let (stop_tx, stop_rx) = channel::<()>();

        // Create watcher
        let mut watcher = RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default().with_poll_interval(Duration::from_secs(2)),
        )
        .map_err(|e| e.to_string())?;

        // Start watching the path
        watcher
            .watch(&path, RecursiveMode::NonRecursive)
            .map_err(|e| e.to_string())?;

        self.watcher = Some(watcher);
        self.watching_path = Some(path.clone());
        self.stop_sender = Some(stop_tx);

        // Spawn event processing thread
        let app = app_handle.clone();
        thread::spawn(move || {
            loop {
                // Check for stop signal
                if stop_rx.try_recv().is_ok() {
                    break;
                }

                // Process file events with timeout
                match rx.recv_timeout(Duration::from_millis(100)) {
                    Ok(Ok(event)) => {
                        handle_event(&app, event);
                    }
                    Ok(Err(e)) => {
                        eprintln!("Watcher error: {:?}", e);
                    }
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                        // Normal timeout, continue
                    }
                    Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    pub fn stop_watching(&mut self) {
        if let Some(sender) = self.stop_sender.take() {
            let _ = sender.send(());
        }
        self.watcher = None;
        self.watching_path = None;
    }

    pub fn is_watching(&self) -> bool {
        self.watcher.is_some()
    }

    pub fn get_watching_path(&self) -> Option<&PathBuf> {
        self.watching_path.as_ref()
    }
}

fn handle_event(app: &AppHandle, event: Event) {
    let event_type = match event.kind {
        EventKind::Create(_) => "create",
        EventKind::Modify(_) => "modify",
        EventKind::Remove(_) => "remove",
        EventKind::Access(_) => return, // Skip access events
        EventKind::Other | EventKind::Any => "other",
    };

    // Get affected paths
    let paths: Vec<String> = event
        .paths
        .iter()
        .filter_map(|p| p.to_str().map(|s| s.to_string()))
        .collect();

    if paths.is_empty() {
        return;
    }

    // Emit event to frontend
    let payload = serde_json::json!({
        "eventType": event_type,
        "paths": paths,
    });

    let _ = app.emit("file-change", payload);
}

// Thread-safe wrapper for the watcher
pub struct WatcherState(pub Arc<Mutex<FileWatcher>>);

impl WatcherState {
    pub fn new() -> Self {
        WatcherState(Arc::new(Mutex::new(FileWatcher::new())))
    }
}
