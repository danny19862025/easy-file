use std::collections::HashMap;
use std::path::PathBuf;

use jwalk::WalkDir;

use crate::error::AppError;
use crate::models::entry::{DiskUsageEntry, DiskUsageReport};

pub async fn analyze_disk_usage(root: PathBuf) -> Result<DiskUsageReport, AppError> {
    tokio::task::spawn_blocking(move || {
        let mut child_sizes: HashMap<PathBuf, (u64, bool)> = HashMap::new();
        let mut total_bytes = 0u64;
        let mut item_count = 0usize;

        for entry_res in WalkDir::new(&root).skip_hidden(false) {
            let Ok(entry) = entry_res else { continue };
            let path = entry.path();
            if path == root {
                continue;
            }
            item_count += 1;

            let Ok(meta) = entry.metadata() else { continue };
            let size = if meta.is_file() { meta.len() } else { 0 };
            total_bytes += size;

            // Attribute size to immediate child under `root`
            if let Ok(rel) = path.strip_prefix(&root) {
                if let Some(first_comp) = rel.components().next() {
                    let top_child = root.join(first_comp.as_os_str());
                    let is_dir = top_child.is_dir();
                    let slot = child_sizes.entry(top_child).or_insert((0, is_dir));
                    slot.0 += size;
                }
            }
        }

        let mut entries: Vec<DiskUsageEntry> = child_sizes
            .into_iter()
            .map(|(path, (size, is_dir))| {
                let name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_else(|| path.to_string_lossy().into_owned());
                let percentage = if total_bytes > 0 {
                    (size as f64 / total_bytes as f64) * 100.0
                } else {
                    0.0
                };
                DiskUsageEntry {
                    name,
                    path: path.to_string_lossy().into_owned(),
                    size,
                    is_dir,
                    percentage,
                }
            })
            .collect();

        entries.sort_by(|a, b| b.size.cmp(&a.size));
        entries.truncate(30);

        Ok(DiskUsageReport {
            root_path: root.to_string_lossy().into_owned(),
            total_bytes,
            item_count,
            entries,
        })
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
}
