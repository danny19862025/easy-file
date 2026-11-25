use std::collections::HashMap;
use std::io::Write;
use std::sync::Arc;

use notify::RecommendedWatcher;
use notify_debouncer_mini::Debouncer;
use portable_pty::MasterPty;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

pub struct PtyHandle {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
}

#[derive(Default)]
pub struct AppState {
    pub dir_scan_tokens: Mutex<HashMap<String, CancellationToken>>,
    pub watchers: Mutex<HashMap<String, Debouncer<RecommendedWatcher>>>,
    pub pty_sessions: Arc<Mutex<HashMap<String, PtyHandle>>>,
}
