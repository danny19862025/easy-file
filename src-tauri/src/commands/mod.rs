use std::path::PathBuf;

use tauri::{ipc::Channel, AppHandle, State};
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::models::entry::{
    DirStreamEvent, DiskUsageReport, MountPoint, PreviewData, UserDirsInfo,
};
use crate::services::{
    cloud_sync, dir_reader, disk_usage, fs_ops, mounts, network, pty, search_index, watcher,
};
use crate::state::AppState;

#[tauri::command]
pub async fn read_directory_stream(
    pane_id: String,
    path: String,
    show_hidden: bool,
    request_id: u64,
    on_event: Channel<DirStreamEvent>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let cancel_token = CancellationToken::new();
    {
        let mut tokens = state.dir_scan_tokens.lock().await;
        if let Some(prev) = tokens.insert(pane_id, cancel_token.clone()) {
            prev.cancel();
        }
    }

    let result = dir_reader::stream_directory(
        PathBuf::from(path),
        show_hidden,
        request_id,
        cancel_token,
        on_event.clone(),
    )
    .await;

    if let Err(ref err) = result {
        let _ = on_event.send(DirStreamEvent::Error {
            request_id,
            message: err.to_string(),
        });
    }

    result
}

#[tauri::command]
pub async fn watch_directory(
    app: AppHandle,
    state: State<'_, AppState>,
    pane_id: String,
    path: String,
) -> Result<(), AppError> {
    watcher::watch_pane_directory(app, &state, pane_id, PathBuf::from(path)).await
}

#[tauri::command]
pub async fn unwatch_directory(
    state: State<'_, AppState>,
    pane_id: String,
) -> Result<(), AppError> {
    watcher::unwatch_pane(&state, &pane_id).await;
    Ok(())
}

#[tauri::command]
pub async fn get_user_dirs() -> UserDirsInfo {
    mounts::get_user_dirs()
}

#[tauri::command]
pub async fn list_mounts() -> Vec<MountPoint> {
    mounts::list_mounts()
}

#[tauri::command]
pub async fn create_dir(
    state: State<'_, AppState>,
    parent: String,
    name: String,
) -> Result<String, AppError> {
    let created = fs_ops::create_dir(&PathBuf::from(parent), &name).await?;
    search_index::invalidate_cache(&state).await;
    Ok(created)
}

#[tauri::command]
pub async fn create_file(
    state: State<'_, AppState>,
    parent: String,
    name: String,
) -> Result<String, AppError> {
    let created = fs_ops::create_file(&PathBuf::from(parent), &name).await?;
    search_index::invalidate_cache(&state).await;
    Ok(created)
}

#[tauri::command]
pub async fn rename_entry(
    state: State<'_, AppState>,
    path: String,
    new_name: String,
) -> Result<String, AppError> {
    let renamed = fs_ops::rename_entry(&PathBuf::from(path), &new_name).await?;
    search_index::invalidate_cache(&state).await;
    Ok(renamed)
}

#[tauri::command]
pub async fn fuzzy_search(
    state: State<'_, AppState>,
    root: String,
    query: String,
    limit: Option<usize>,
    force_reindex: Option<bool>,
) -> Result<search_index::SearchResponse, AppError> {
    search_index::fuzzy_search(
        &state,
        PathBuf::from(root),
        query,
        limit.unwrap_or(60),
        force_reindex.unwrap_or(false),
    )
    .await
}

#[tauri::command]
pub async fn move_to_trash(paths: Vec<String>) -> Result<(), AppError> {
    fs_ops::move_to_trash(paths.into_iter().map(PathBuf::from).collect()).await
}

#[tauri::command]
pub async fn delete_permanent(paths: Vec<String>) -> Result<(), AppError> {
    fs_ops::delete_permanent(paths.into_iter().map(PathBuf::from).collect()).await
}

#[tauri::command]
pub async fn copy_entries(sources: Vec<String>, dest_dir: String) -> Result<(), AppError> {
    fs_ops::copy_entries(
        sources.into_iter().map(PathBuf::from).collect(),
        PathBuf::from(dest_dir),
    )
    .await
}

#[tauri::command]
pub async fn move_entries(sources: Vec<String>, dest_dir: String) -> Result<(), AppError> {
    fs_ops::move_entries(
        sources.into_iter().map(PathBuf::from).collect(),
        PathBuf::from(dest_dir),
    )
    .await
}

#[tauri::command]
pub async fn read_preview(path: String) -> Result<PreviewData, AppError> {
    fs_ops::read_preview(&PathBuf::from(path)).await
}

#[tauri::command]
pub async fn open_with_default(path: String) -> Result<(), AppError> {
    fs_ops::open_with_default(&PathBuf::from(path))
}

#[tauri::command]
pub async fn analyze_disk_usage(path: String) -> Result<DiskUsageReport, AppError> {
    disk_usage::analyze_disk_usage(PathBuf::from(path)).await
}

#[tauri::command]
pub async fn spawn_pty(
    state: State<'_, AppState>,
    session_id: String,
    cwd: String,
    cols: u16,
    rows: u16,
    on_output: Channel<String>,
) -> Result<(), AppError> {
    pty::spawn_pty(&state, session_id, PathBuf::from(cwd), cols, rows, on_output).await
}

#[tauri::command]
pub async fn write_pty(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), AppError> {
    pty::write_pty(&state, &session_id, &data).await
}

#[tauri::command]
pub async fn resize_pty(
    state: State<'_, AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), AppError> {
    pty::resize_pty(&state, &session_id, cols, rows).await
}

#[tauri::command]
pub async fn close_pty(state: State<'_, AppState>, session_id: String) -> Result<(), AppError> {
    pty::close_pty(&state, &session_id).await;
    Ok(())
}

// --- Network (GVFS: SMB, SFTP, FTP, WebDAV) ---

#[tauri::command]
pub async fn check_network_tools() -> network::ToolAvailability {
    network::check_tools()
}

#[tauri::command]
pub async fn list_network_bookmarks() -> Vec<network::NetworkBookmark> {
    network::list_bookmarks()
}

#[tauri::command]
pub async fn connect_network(
    name: String,
    protocol: String,
    host: String,
    port: Option<u16>,
    share_path: Option<String>,
    username: Option<String>,
) -> Result<network::NetworkBookmark, AppError> {
    network::connect_network(name, protocol, host, port, share_path, username).await
}

#[tauri::command]
pub async fn unmount_network(uri: String) -> Result<(), AppError> {
    network::unmount_network(uri).await
}

#[tauri::command]
pub async fn remove_network_bookmark(id: String) -> Result<(), AppError> {
    network::remove_bookmark(&id)
}

// --- Cloud Remotes & Auto-Sync (Google Drive & Dropbox via rclone) ---

#[tauri::command]
pub async fn list_cloud_remotes() -> Vec<cloud_sync::RcloneRemote> {
    cloud_sync::list_rclone_remotes().await
}

#[tauri::command]
pub async fn mount_cloud_remote(remote_name: String) -> Result<String, AppError> {
    cloud_sync::mount_rclone_remote(remote_name).await
}

#[tauri::command]
pub async fn unmount_cloud_remote(mount_path: String) -> Result<(), AppError> {
    cloud_sync::unmount_rclone_remote(mount_path).await
}

#[tauri::command]
pub async fn list_sync_rules() -> Vec<cloud_sync::SyncRule> {
    cloud_sync::load_rules()
}

#[tauri::command]
pub async fn add_sync_rule(
    name: String,
    provider: String,
    remote_name: String,
    local_path: String,
    remote_path: String,
    mode: String,
    interval_mins: u64,
) -> Result<cloud_sync::SyncRule, AppError> {
    cloud_sync::add_sync_rule(
        name,
        provider,
        remote_name,
        local_path,
        remote_path,
        mode,
        interval_mins,
    )
}

#[tauri::command]
pub async fn toggle_sync_rule(
    id: String,
    enabled: bool,
) -> Result<Vec<cloud_sync::SyncRule>, AppError> {
    cloud_sync::toggle_sync_rule(&id, enabled)
}

#[tauri::command]
pub async fn delete_sync_rule(id: String) -> Result<Vec<cloud_sync::SyncRule>, AppError> {
    cloud_sync::delete_sync_rule(&id)
}

#[tauri::command]
pub async fn run_sync_rule_now(app: AppHandle, id: String) -> Result<cloud_sync::SyncRule, AppError> {
    cloud_sync::run_sync_rule(&app, &id).await
}
