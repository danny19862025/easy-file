use std::fs;
use std::path::PathBuf;

use sysinfo::Disks;

use crate::models::entry::{MountPoint, UserDirsInfo};

pub fn get_user_dirs() -> UserDirsInfo {
    let home = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/"))
        .to_string_lossy()
        .into_owned();

    let to_opt = |p: Option<PathBuf>| p.map(|d| d.to_string_lossy().into_owned());

    UserDirsInfo {
        home,
        desktop: to_opt(dirs::desktop_dir()),
        documents: to_opt(dirs::document_dir()),
        downloads: to_opt(dirs::download_dir()),
        pictures: to_opt(dirs::picture_dir()),
        music: to_opt(dirs::audio_dir()),
        videos: to_opt(dirs::video_dir()),
    }
}

pub fn list_mounts() -> Vec<MountPoint> {
    let disks = Disks::new_with_refreshed_list();
    let mut mounts = Vec::new();

    for disk in disks.list() {
        let mount_path = disk.mount_point().to_string_lossy().into_owned();
        // Filter noisy pseudo-mounts on Linux
        if mount_path.starts_with("/snap/")
            || mount_path.starts_with("/boot")
            || mount_path.starts_with("/var/lib/docker")
        {
            continue;
        }

        let name = if mount_path == "/" {
            "Root Filesystem".to_string()
        } else {
            disk.mount_point()
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| mount_path.clone())
        };

        mounts.push(MountPoint {
            name,
            mount_path,
            fs_type: disk.file_system().to_string_lossy().into_owned(),
            total_bytes: disk.total_space(),
            available_bytes: disk.available_space(),
            is_removable: disk.is_removable(),
            is_gvfs: false,
        });
    }

    // Discover GVFS network/MTP/SFTP mounts under $XDG_RUNTIME_DIR/gvfs
    if let Ok(runtime_dir) = std::env::var("XDG_RUNTIME_DIR") {
        let gvfs_dir = PathBuf::from(runtime_dir).join("gvfs");
        if let Ok(entries) = fs::read_dir(&gvfs_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().into_owned();
                mounts.push(MountPoint {
                    name,
                    mount_path: path.to_string_lossy().into_owned(),
                    fs_type: "gvfs".to_string(),
                    total_bytes: 0,
                    available_bytes: 0,
                    is_removable: true,
                    is_gvfs: true,
                });
            }
        }
    }

    mounts
}
