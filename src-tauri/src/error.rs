use serde::Serialize;
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error on '{path}': {source}")]
    Io {
        path: String,
        #[source]
        source: std::io::Error,
    },
    #[error("Trash error: {0}")]
    Trash(String),
    #[error("Watcher error: {0}")]
    Watcher(String),
    #[error("Terminal error: {0}")]
    Terminal(String),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("{0}")]
    Other(String),
}

impl AppError {
    pub fn io(path: impl AsRef<Path>, source: std::io::Error) -> Self {
        Self::Io {
            path: path.as_ref().to_string_lossy().into_owned(),
            source,
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
