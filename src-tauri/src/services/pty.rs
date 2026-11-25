use std::io::{Read, Write};
use std::path::PathBuf;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::ipc::Channel;

use crate::error::AppError;
use crate::state::{AppState, PtyHandle};

pub async fn spawn_pty(
    state: &AppState,
    session_id: String,
    cwd: PathBuf,
    cols: u16,
    rows: u16,
    on_output: Channel<String>,
) -> Result<(), AppError> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: rows.max(4),
            cols: cols.max(20),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| AppError::Terminal(e.to_string()))?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
    let mut cmd = CommandBuilder::new(shell);
    cmd.cwd(cwd);
    cmd.env("TERM", "xterm-256color");

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| AppError::Terminal(e.to_string()))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| AppError::Terminal(e.to_string()))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| AppError::Terminal(e.to_string()))?;

    {
        let mut sessions = state.pty_sessions.lock().await;
        sessions.insert(
            session_id.clone(),
            PtyHandle {
                master: pair.master,
                writer,
            },
        );
    }

    // Background blocking reader streams PTY bytes over Tauri Channel
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).into_owned();
                    if on_output.send(chunk).is_err() {
                        break;
                    }
                }
            }
        }
        let _ = child.wait();
    });

    Ok(())
}

pub async fn write_pty(state: &AppState, session_id: &str, data: &str) -> Result<(), AppError> {
    let mut sessions = state.pty_sessions.lock().await;
    let handle = sessions
        .get_mut(session_id)
        .ok_or_else(|| AppError::Terminal("PTY session not found".into()))?;
    handle
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| AppError::Terminal(e.to_string()))?;
    handle
        .writer
        .flush()
        .map_err(|e| AppError::Terminal(e.to_string()))?;
    Ok(())
}

pub async fn resize_pty(
    state: &AppState,
    session_id: &str,
    cols: u16,
    rows: u16,
) -> Result<(), AppError> {
    let sessions = state.pty_sessions.lock().await;
    if let Some(handle) = sessions.get(session_id) {
        handle
            .master
            .resize(PtySize {
                rows: rows.max(4),
                cols: cols.max(20),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::Terminal(e.to_string()))?;
    }
    Ok(())
}

pub async fn close_pty(state: &AppState, session_id: &str) {
    let mut sessions = state.pty_sessions.lock().await;
    sessions.remove(session_id);
}
