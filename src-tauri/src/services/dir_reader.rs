use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::time::{Instant, UNIX_EPOCH};

use tauri::ipc::Channel;
use tokio::fs;
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::models::entry::{DirStreamEvent, EntryKind, FileEntry};

const BATCH_SIZE: usize = 256;

pub async fn stream_directory(
    path: PathBuf,
    show_hidden: bool,
    request_id: u64,
    cancel_token: CancellationToken,
    on_event: Channel<DirStreamEvent>,
) -> Result<(), AppError> {
    let started = Instant::now();
    let mut read_dir = fs::read_dir(&path)
        .await
        .map_err(|e| AppError::io(&path, e))?;

    let mut batch = Vec::with_capacity(BATCH_SIZE);
    let mut total_count = 0usize;

    loop {
        if cancel_token.is_cancelled() {
            return Ok(());
        }

        let next_entry = tokio::select! {
            _ = cancel_token.cancelled() => return Ok(()),
            res = read_dir.next_entry() => res,
        };

        let Some(entry) = next_entry.map_err(|e| AppError::io(&path, e))? else {
            break;
        };

        let file_name = entry.file_name().to_string_lossy().into_owned();
        let is_hidden = file_name.starts_with('.');
        if !show_hidden && is_hidden {
            continue;
        }

        let entry_path = entry.path();
        if let Some(parsed) = build_file_entry(file_name, entry_path, is_hidden).await {
            batch.push(parsed);
            total_count += 1;

            if batch.len() >= BATCH_SIZE {
                let payload = std::mem::replace(&mut batch, Vec::with_capacity(BATCH_SIZE));
                let _ = on_event.send(DirStreamEvent::Batch {
                    request_id,
                    entries: payload,
                });
            }
        }
    }

    if !batch.is_empty() && !cancel_token.is_cancelled() {
        let _ = on_event.send(DirStreamEvent::Batch {
            request_id,
            entries: batch,
        });
    }

    if !cancel_token.is_cancelled() {
        let _ = on_event.send(DirStreamEvent::Complete {
            request_id,
            total_count,
            elapsed_ms: started.elapsed().as_millis() as u64,
        });
    }

    Ok(())
}

async fn build_file_entry(name: String, path: PathBuf, is_hidden: bool) -> Option<FileEntry> {
    let sym_meta = fs::symlink_metadata(&path).await.ok()?;
    let is_symlink = sym_meta.file_type().is_symlink();

    let (effective_meta, symlink_target) = if is_symlink {
        let target = fs::read_link(&path)
            .await
            .ok()
            .map(|p| p.to_string_lossy().into_owned());
        let resolved = fs::metadata(&path).await.unwrap_or(sym_meta);
        (resolved, target)
    } else {
        (sym_meta, None)
    };

    let is_dir = effective_meta.is_dir();
    let kind = if is_symlink {
        EntryKind::Symlink
    } else if is_dir {
        EntryKind::Directory
    } else if effective_meta.is_file() {
        EntryKind::File
    } else {
        EntryKind::Other
    };

    let modified_ms = effective_meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64);

    let extension = if is_dir {
        None
    } else {
        Path::new(&name)
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_ascii_lowercase())
    };

    let mime_type = if is_dir {
        Some("inode/directory".to_string())
    } else {
        mime_guess::from_path(&path)
            .first()
            .map(|m| m.essence_str().to_string())
    };

    Some(FileEntry {
        name,
        path: path.to_string_lossy().into_owned(),
        kind,
        is_dir,
        is_hidden,
        is_symlink,
        symlink_target,
        size: if is_dir { 0 } else { effective_meta.len() },
        modified_ms,
        permissions_octal: effective_meta.permissions().mode() & 0o7777,
        extension,
        mime_type,
    })
}
