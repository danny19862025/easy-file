use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncReadExt;

use crate::error::AppError;
use crate::models::entry::PreviewData;

const MAX_TEXT_PREVIEW_BYTES: usize = 128 * 1024;

pub async fn create_dir(parent: &Path, name: &str) -> Result<String, AppError> {
    validate_name(name)?;
    let target = parent.join(name);
    fs::create_dir(&target)
        .await
        .map_err(|e| AppError::io(&target, e))?;
    Ok(target.to_string_lossy().into_owned())
}

pub async fn create_file(parent: &Path, name: &str) -> Result<String, AppError> {
    validate_name(name)?;
    let target = parent.join(name);
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&target)
        .await
        .map_err(|e| AppError::io(&target, e))?;
    Ok(target.to_string_lossy().into_owned())
}

pub async fn rename_entry(path: &Path, new_name: &str) -> Result<String, AppError> {
    validate_name(new_name)?;
    let parent = path
        .parent()
        .ok_or_else(|| AppError::InvalidPath("Cannot rename root directory".into()))?;
    let target = parent.join(new_name);
    fs::rename(path, &target)
        .await
        .map_err(|e| AppError::io(&target, e))?;
    Ok(target.to_string_lossy().into_owned())
}

pub async fn move_to_trash(paths: Vec<PathBuf>) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || {
        trash::delete_all(&paths).map_err(|e| AppError::Trash(e.to_string()))
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
}

pub async fn delete_permanent(paths: Vec<PathBuf>) -> Result<(), AppError> {
    for path in paths {
        let meta = fs::symlink_metadata(&path)
            .await
            .map_err(|e| AppError::io(&path, e))?;
        if meta.is_dir() {
            fs::remove_dir_all(&path)
                .await
                .map_err(|e| AppError::io(&path, e))?;
        } else {
            fs::remove_file(&path)
                .await
                .map_err(|e| AppError::io(&path, e))?;
        }
    }
    Ok(())
}

pub async fn copy_entries(sources: Vec<PathBuf>, dest_dir: PathBuf) -> Result<(), AppError> {
    for src in sources {
        let name = src
            .file_name()
            .ok_or_else(|| AppError::InvalidPath(src.to_string_lossy().into_owned()))?;
        let dest = unique_dest_path(&dest_dir, name.to_string_lossy().as_ref()).await;
        copy_recursive(src, dest).await?;
    }
    Ok(())
}

pub async fn move_entries(sources: Vec<PathBuf>, dest_dir: PathBuf) -> Result<(), AppError> {
    for src in sources {
        let name = src
            .file_name()
            .ok_or_else(|| AppError::InvalidPath(src.to_string_lossy().into_owned()))?;
        let dest = dest_dir.join(name);
        if fs::rename(&src, &dest).await.is_err() {
            // Cross-device move fallback: copy then remove
            copy_recursive(src.clone(), dest).await?;
            let meta = fs::symlink_metadata(&src)
                .await
                .map_err(|e| AppError::io(&src, e))?;
            if meta.is_dir() {
                fs::remove_dir_all(&src)
                    .await
                    .map_err(|e| AppError::io(&src, e))?;
            } else {
                fs::remove_file(&src)
                    .await
                    .map_err(|e| AppError::io(&src, e))?;
            }
        }
    }
    Ok(())
}

pub async fn read_preview(path: &Path) -> Result<PreviewData, AppError> {
    let meta = fs::metadata(path).await.map_err(|e| AppError::io(path, e))?;
    let mime = mime_guess::from_path(path)
        .first()
        .map(|m| m.essence_str().to_string())
        .unwrap_or_else(|| "application/octet-stream".to_string());

    let encoded = urlencoding::encode(&path.to_string_lossy()).into_owned();
    let media_url = format!("localfile://localhost/?path={encoded}");

    if mime.starts_with("image/") {
        return Ok(PreviewData::Image {
            url: media_url,
            mime,
        });
    }
    if mime.starts_with("video/") {
        return Ok(PreviewData::Video {
            url: media_url,
            mime,
        });
    }
    if mime.starts_with("audio/") {
        return Ok(PreviewData::Audio {
            url: media_url,
            mime,
        });
    }
    if mime == "application/pdf" {
        return Ok(PreviewData::Pdf { url: media_url });
    }

    let is_probably_text = mime.starts_with("text/")
        || matches!(
            mime.as_str(),
            "application/json"
                | "application/javascript"
                | "application/xml"
                | "application/x-sh"
                | "application/toml"
                | "application/x-yaml"
        )
        || path
            .extension()
            .and_then(|e| e.to_str())
            .is_some_and(|ext| {
                matches!(
                    ext.to_ascii_lowercase().as_str(),
                    "rs" | "ts" | "tsx" | "js" | "jsx" | "py" | "md" | "toml" | "yaml" | "yml"
                        | "json" | "css" | "html" | "sh" | "c" | "cpp" | "h" | "hpp" | "go" | "txt"
                        | "log" | "conf" | "ini" | "env"
                )
            });

    if is_probably_text {
        let mut file = fs::File::open(path)
            .await
            .map_err(|e| AppError::io(path, e))?;
        let mut buf = vec![0u8; MAX_TEXT_PREVIEW_BYTES.min(meta.len() as usize)];
        let n = file
            .read(&mut buf)
            .await
            .map_err(|e| AppError::io(path, e))?;
        buf.truncate(n);
        let content = String::from_utf8_lossy(&buf).into_owned();
        let truncated = meta.len() as usize > MAX_TEXT_PREVIEW_BYTES;
        return Ok(PreviewData::Text {
            content,
            truncated,
            mime,
        });
    }

    Ok(PreviewData::Binary {
        mime,
        size: meta.len(),
    })
}

pub fn open_with_default(path: &Path) -> Result<(), AppError> {
    std::process::Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map_err(|e| AppError::io(path, e))?;
    Ok(())
}

fn validate_name(name: &str) -> Result<(), AppError> {
    if name.is_empty() || name == "." || name == ".." || name.contains('/') {
        return Err(AppError::InvalidPath(format!("Invalid entry name: {name}")));
    }
    Ok(())
}

async fn unique_dest_path(dest_dir: &Path, name: &str) -> PathBuf {
    let candidate = dest_dir.join(name);
    if fs::symlink_metadata(&candidate).await.is_err() {
        return candidate;
    }
    let stem = Path::new(name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(name);
    let ext = Path::new(name).extension().and_then(|e| e.to_str());

    for i in 1..1000 {
        let next_name = match ext {
            Some(e) => format!("{stem} ({i}).{e}"),
            None => format!("{stem} ({i})"),
        };
        let next = dest_dir.join(next_name);
        if fs::symlink_metadata(&next).await.is_err() {
            return next;
        }
    }
    dest_dir.join(format!("{name}_copy"))
}

fn copy_recursive(
    src: PathBuf,
    dest: PathBuf,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), AppError>> + Send>> {
    Box::pin(async move {
        let meta = fs::symlink_metadata(&src)
            .await
            .map_err(|e| AppError::io(&src, e))?;
        if meta.is_dir() {
            fs::create_dir_all(&dest)
                .await
                .map_err(|e| AppError::io(&dest, e))?;
            let mut entries = fs::read_dir(&src)
                .await
                .map_err(|e| AppError::io(&src, e))?;
            while let Some(entry) = entries
                .next_entry()
                .await
                .map_err(|e| AppError::io(&src, e))?
            {
                let child_src = entry.path();
                let child_dest = dest.join(entry.file_name());
                copy_recursive(child_src, child_dest).await?;
            }
        } else {
            fs::copy(&src, &dest)
                .await
                .map_err(|e| AppError::io(&dest, e))?;
        }
        Ok(())
    })
}
