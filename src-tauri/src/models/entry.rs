use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum EntryKind {
    Directory,
    File,
    Symlink,
    Other,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub kind: EntryKind,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub is_symlink: bool,
    pub symlink_target: Option<String>,
    pub size: u64,
    pub modified_ms: Option<i64>,
    pub permissions_octal: u32,
    pub extension: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "event",
    content = "data",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum DirStreamEvent {
    Batch {
        request_id: u64,
        entries: Vec<FileEntry>,
    },
    Complete {
        request_id: u64,
        total_count: usize,
        elapsed_ms: u64,
    },
    Error {
        request_id: u64,
        message: String,
    },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MountPoint {
    pub name: String,
    pub mount_path: String,
    pub fs_type: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub is_removable: bool,
    pub is_gvfs: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDirsInfo {
    pub home: String,
    pub desktop: Option<String>,
    pub documents: Option<String>,
    pub downloads: Option<String>,
    pub pictures: Option<String>,
    pub music: Option<String>,
    pub videos: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskUsageEntry {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskUsageReport {
    pub root_path: String,
    pub total_bytes: u64,
    pub item_count: usize,
    pub entries: Vec<DiskUsageEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PreviewData {
    Text {
        content: String,
        truncated: bool,
        mime: String,
    },
    Image {
        url: String,
        mime: String,
    },
    Video {
        url: String,
        mime: String,
    },
    Audio {
        url: String,
        mime: String,
    },
    Pdf {
        url: String,
    },
    Binary {
        mime: String,
        size: u64,
    },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsDeltaEvent {
    pub pane_id: String,
    pub watched_path: String,
    pub changed_paths: Vec<String>,
}
