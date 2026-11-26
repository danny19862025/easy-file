use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tokio::process::Command;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkBookmark {
    pub id: String,
    pub name: String,
    pub protocol: String,
    pub uri: String,
    pub mount_path: Option<String>,
    pub mounted: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolAvailability {
    pub has_gio: bool,
    pub has_rclone: bool,
}

fn bookmarks_file() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("easy-file")
        .join("network_bookmarks.json")
}

fn load_bookmarks() -> Vec<NetworkBookmark> {
    let path = bookmarks_file();
    let Ok(raw) = fs::read_to_string(&path) else {
        return Vec::new();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save_bookmarks(list: &[NetworkBookmark]) -> Result<(), AppError> {
    let path = bookmarks_file();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::io(parent, e))?;
    }
    let json = serde_json::to_string_pretty(list).map_err(|e| AppError::Other(e.to_string()))?;
    fs::write(&path, json).map_err(|e| AppError::io(&path, e))
}

fn find_gvfs_mount_for_uri(uri: &str) -> Option<String> {
    let runtime_dir = std::env::var("XDG_RUNTIME_DIR").ok()?;
    let gvfs_dir = PathBuf::from(runtime_dir).join("gvfs");
    let entries = fs::read_dir(&gvfs_dir).ok()?;

    // Extract host token from URI like smb://user@192.168.1.10/share or sftp://host/path
    let without_scheme = uri.split("://").nth(1).unwrap_or(uri);
    let authority = without_scheme.split('/').next().unwrap_or("");
    let host_port = authority.rsplit('@').next().unwrap_or(authority);
    let host = host_port.split(':').next().unwrap_or(host_port).to_lowercase();

    for entry in entries.flatten() {
        let fname = entry.file_name().to_string_lossy().to_lowercase();
        if !host.is_empty() && fname.contains(&host) {
            return Some(entry.path().to_string_lossy().into_owned());
        }
    }
    None
}

pub fn check_tools() -> ToolAvailability {
    let has = |bin: &str| {
        std::process::Command::new("which")
            .arg(bin)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };
    ToolAvailability {
        has_gio: has("gio"),
        has_rclone: has("rclone"),
    }
}

pub fn list_bookmarks() -> Vec<NetworkBookmark> {
    load_bookmarks()
        .into_iter()
        .map(|mut b| {
            let live = find_gvfs_mount_for_uri(&b.uri);
            b.mounted = live.is_some();
            b.mount_path = live;
            b
        })
        .collect()
}

pub async fn connect_network(
    name: String,
    protocol: String,
    host: String,
    port: Option<u16>,
    share_path: Option<String>,
    username: Option<String>,
) -> Result<NetworkBookmark, AppError> {
    let clean_host = host.trim();
    if clean_host.is_empty() {
        return Err(AppError::InvalidPath("Host cannot be empty".into()));
    }

    let scheme = match protocol.as_str() {
        "smb" | "sftp" | "ftp" | "dav" | "davs" => protocol.as_str(),
        _ => "smb",
    };

    let auth = username
        .as_deref()
        .map(str::trim)
        .filter(|u| !u.is_empty())
        .map(|u| format!("{u}@"))
        .unwrap_or_default();

    let port_part = port.map(|p| format!(":{p}")).unwrap_or_default();
    let raw_path = share_path.unwrap_or_default();
    let trimmed_path = raw_path.trim().trim_start_matches('/');
    let path_part = if trimmed_path.is_empty() {
        String::new()
    } else {
        format!("/{trimmed_path}")
    };

    let uri = format!("{scheme}://{auth}{clean_host}{port_part}{path_part}");

    // Mount via Linux GVFS (gio mount)
    let output = Command::new("gio")
        .arg("mount")
        .arg(&uri)
        .output()
        .await
        .map_err(|e| AppError::Other(format!("Failed to run gio mount: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if !stderr.to_lowercase().contains("already mounted") {
            return Err(AppError::Other(if stderr.is_empty() {
                format!("gio mount failed for {uri}")
            } else {
                stderr
            }));
        }
    }

    let mount_path = find_gvfs_mount_for_uri(&uri);
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);

    let bookmark = NetworkBookmark {
        id: format!("net-{now_ms}"),
        name: if name.trim().is_empty() {
            format!("{} ({})", clean_host, scheme.to_uppercase())
        } else {
            name.trim().to_string()
        },
        protocol: scheme.to_string(),
        uri: uri.clone(),
        mounted: mount_path.is_some(),
        mount_path,
    };

    let mut list = load_bookmarks();
    if let Some(existing) = list.iter_mut().find(|b| b.uri == uri) {
        existing.name = bookmark.name.clone();
        existing.mount_path = bookmark.mount_path.clone();
        existing.mounted = bookmark.mounted;
    } else {
        list.push(bookmark.clone());
    }
    save_bookmarks(&list)?;

    Ok(bookmark)
}

pub async fn unmount_network(uri: String) -> Result<(), AppError> {
    let output = Command::new("gio")
        .args(["mount", "-u", &uri])
        .output()
        .await
        .map_err(|e| AppError::Other(format!("Failed to unmount: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(AppError::Other(if stderr.is_empty() {
            "Unmount failed".into()
        } else {
            stderr
        }));
    }
    Ok(())
}

pub fn remove_bookmark(id: &str) -> Result<(), AppError> {
    let list: Vec<NetworkBookmark> = load_bookmarks()
        .into_iter()
        .filter(|b| b.id != id)
        .collect();
    save_bookmarks(&list)
}
