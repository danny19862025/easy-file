use std::path::PathBuf;
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_mini::new_debouncer;
use tauri::{AppHandle, Emitter};

use crate::error::AppError;
use crate::models::entry::FsDeltaEvent;
use crate::state::AppState;

pub async fn watch_pane_directory(
    app: AppHandle,
    state: &AppState,
    pane_id: String,
    path: PathBuf,
) -> Result<(), AppError> {
    let watched_str = path.to_string_lossy().into_owned();
    let pane_clone = pane_id.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(120),
        move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
            if let Ok(events) = res {
                let changed_paths: Vec<String> = events
                    .into_iter()
                    .map(|e| e.path.to_string_lossy().into_owned())
                    .collect();
                if !changed_paths.is_empty() {
                    let _ = app.emit(
                        "fs:delta",
                        FsDeltaEvent {
                            pane_id: pane_clone.clone(),
                            watched_path: watched_str.clone(),
                            changed_paths,
                        },
                    );
                }
            }
        },
    )
    .map_err(|e| AppError::Watcher(e.to_string()))?;

    debouncer
        .watcher()
        .watch(&path, RecursiveMode::NonRecursive)
        .map_err(|e| AppError::Watcher(e.to_string()))?;

    let mut guard = state.watchers.lock().await;
    guard.insert(pane_id, debouncer);
    Ok(())
}

pub async fn unwatch_pane(state: &AppState, pane_id: &str) {
    let mut guard = state.watchers.lock().await;
    guard.remove(pane_id);
}
