use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::process::Command;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RcloneRemote {
    pub name: String,
    pub provider: String,
    pub mount_path: Option<String>,
    pub mounted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncRule {
    pub id: String,
    pub name: String,
    pub provider: String, // "google-drive" | "dropbox"
    pub remote_name: String,
    pub local_path: String,
    pub remote_path: String,
    pub mode: String, // "backup" (rclone copy) | "mirror" (rclone sync)
    pub interval_mins: u64,
    pub enabled: bool,
    pub last_sync_ms: Option<i64>,
    pub last_status: String, // "idle" | "syncing" | "ok" | "error"
    pub last_error: Option<String>,
}

fn rules_file() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("easy-file")
        .join("sync_rules.json")
}

fn cloud_mount_root() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("Cloud")
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn is_path_mounted(target: &PathBuf) -> bool {
    let Ok(mounts) = fs::read_to_string("/proc/mounts") else {
        return false;
    };
    let needle = target.to_string_lossy();
    mounts.lines().any(|line| {
        line.split_whitespace()
            .nth(1)
            .is_some_and(|mp| mp == needle.as_ref())
    })
}

pub fn load_rules() -> Vec<SyncRule> {
    let Ok(raw) = fs::read_to_string(rules_file()) else {
        return Vec::new();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save_rules(rules: &[SyncRule]) -> Result<(), AppError> {
    let path = rules_file();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::io(parent, e))?;
    }
    let json = serde_json::to_string_pretty(rules).map_err(|e| AppError::Other(e.to_string()))?;
    fs::write(&path, json).map_err(|e| AppError::io(&path, e))
}

pub async fn list_rclone_remotes() -> Vec<RcloneRemote> {
    let Ok(output) = Command::new("rclone")
        .args(["listremotes", "--long"])
        .output()
        .await
    else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut remotes = Vec::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let mut parts = trimmed.split_whitespace();
        let Some(raw_name) = parts.next() else {
            continue;
        };
        let name = raw_name.trim_end_matches(':').to_string();
        let provider = parts.next().unwrap_or("cloud").to_string();
        let expected_mount = cloud_mount_root().join(&name);
        let mounted = is_path_mounted(&expected_mount);
        remotes.push(RcloneRemote {
            name,
            provider,
            mount_path: if mounted {
                Some(expected_mount.to_string_lossy().into_owned())
            } else {
                None
            },
            mounted,
        });
    }
    remotes
}

pub async fn mount_rclone_remote(remote_name: String) -> Result<String, AppError> {
    let clean = remote_name.trim().trim_end_matches(':');
    if clean.is_empty() {
        return Err(AppError::InvalidPath("Remote name cannot be empty".into()));
    }
    let mount_dir = cloud_mount_root().join(clean);
    fs::create_dir_all(&mount_dir).map_err(|e| AppError::io(&mount_dir, e))?;

    if is_path_mounted(&mount_dir) {
        return Ok(mount_dir.to_string_lossy().into_owned());
    }

    let remote_spec = format!("{clean}:");
    let output = Command::new("rclone")
        .args([
            "mount",
            &remote_spec,
            mount_dir.to_string_lossy().as_ref(),
            "--vfs-cache-mode",
            "writes",
            "--daemon",
        ])
        .output()
        .await
        .map_err(|e| AppError::Other(format!("Failed to run rclone mount: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(AppError::Other(if stderr.is_empty() {
            "rclone mount failed".into()
        } else {
            stderr
        }));
    }

    Ok(mount_dir.to_string_lossy().into_owned())
}

pub async fn unmount_rclone_remote(mount_path: String) -> Result<(), AppError> {
    let status = Command::new("fusermount3")
        .args(["-u", &mount_path])
        .status()
        .await;

    let ok = match status {
        Ok(s) if s.success() => true,
        _ => Command::new("fusermount")
            .args(["-u", &mount_path])
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false),
    };

    if !ok {
        return Err(AppError::Other(format!(
            "Could not unmount {mount_path}"
        )));
    }
    Ok(())
}

pub fn add_sync_rule(
    name: String,
    provider: String,
    remote_name: String,
    local_path: String,
    remote_path: String,
    mode: String,
    interval_mins: u64,
) -> Result<SyncRule, AppError> {
    if local_path.trim().is_empty() || remote_name.trim().is_empty() {
        return Err(AppError::InvalidPath(
            "Local folder and remote name are required".into(),
        ));
    }

    let rule = SyncRule {
        id: format!("sync-{}", now_ms()),
        name: if name.trim().is_empty() {
            format!("{} Backup", provider)
        } else {
            name.trim().to_string()
        },
        provider,
        remote_name: remote_name.trim().trim_end_matches(':').to_string(),
        local_path: local_path.trim().to_string(),
        remote_path: remote_path.trim().trim_start_matches('/').to_string(),
        mode: if mode == "mirror" {
            "mirror".into()
        } else {
            "backup".into()
        },
        interval_mins: interval_mins.max(1),
        enabled: true,
        last_sync_ms: None,
        last_status: "idle".into(),
        last_error: None,
    };

    let mut rules = load_rules();
    rules.push(rule.clone());
    save_rules(&rules)?;
    Ok(rule)
}

pub fn toggle_sync_rule(id: &str, enabled: bool) -> Result<Vec<SyncRule>, AppError> {
    let mut rules = load_rules();
    for r in &mut rules {
        if r.id == id {
            r.enabled = enabled;
        }
    }
    save_rules(&rules)?;
    Ok(rules)
}

pub fn delete_sync_rule(id: &str) -> Result<Vec<SyncRule>, AppError> {
    let rules: Vec<SyncRule> = load_rules().into_iter().filter(|r| r.id != id).collect();
    save_rules(&rules)?;
    Ok(rules)
}

pub async fn run_sync_rule(app: &AppHandle, id: &str) -> Result<SyncRule, AppError> {
    let mut rules = load_rules();
    let Some(rule) = rules.iter_mut().find(|r| r.id == id) else {
        return Err(AppError::Other("Sync rule not found".into()));
    };

    rule.last_status = "syncing".into();
    rule.last_error = None;
    let snapshot = rule.clone();
    let _ = save_rules(&rules);
    let _ = app.emit("cloud:sync-updated", &rules);

    let subcmd = if snapshot.mode == "mirror" {
        "sync"
    } else {
        "copy"
    };
    let dest = format!("{}:{}", snapshot.remote_name, snapshot.remote_path);

    let output = Command::new("rclone")
        .args([subcmd, &snapshot.local_path, &dest, "--fast-list"])
        .output()
        .await;

    let mut refreshed = load_rules();
    if let Some(target) = refreshed.iter_mut().find(|r| r.id == id) {
        target.last_sync_ms = Some(now_ms());
        match output {
            Ok(out) if out.status.success() => {
                target.last_status = "ok".into();
                target.last_error = None;
            }
            Ok(out) => {
                let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
                target.last_status = "error".into();
                target.last_error = Some(if err.is_empty() {
                    "rclone exited with non-zero status".into()
                } else {
                    err
                });
            }
            Err(e) => {
                target.last_status = "error".into();
                target.last_error = Some(e.to_string());
            }
        }
        let updated = target.clone();
        let _ = save_rules(&refreshed);
        let _ = app.emit("cloud:sync-updated", &refreshed);
        return Ok(updated);
    }

    Err(AppError::Other("Sync rule removed during execution".into()))
}

/// Starts a lightweight background auto-sync scheduler (checks every 60s).
pub fn start_autosync_scheduler(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(60));
        // Skip immediate tick on cold start so app startup stays instant
        ticker.tick().await;
        loop {
            ticker.tick().await;
            let rules = load_rules();
            let now = now_ms();
            for rule in rules {
                if !rule.enabled || rule.last_status == "syncing" {
                    continue;
                }
                let due = match rule.last_sync_ms {
                    None => true,
                    Some(last) => (now - last) >= (rule.interval_mins as i64 * 60_000),
                };
                if due {
                    let _ = run_sync_rule(&app, &rule.id).await;
                }
            }
        }
    });
}
