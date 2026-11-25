use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Instant;

use jwalk::WalkDir;
use serde::Serialize;

use crate::error::AppError;
use crate::state::AppState;

const MAX_INDEX_ENTRIES: usize = 60_000;

#[derive(Debug, Clone)]
pub struct IndexedEntry {
    pub name: String,
    pub name_lower: String,
    pub path: String,
    pub parent_dir: String,
    pub is_dir: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub name: String,
    pub path: String,
    pub parent_dir: String,
    pub is_dir: bool,
    pub score: i32,
    pub match_indices: Vec<usize>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub hits: Vec<SearchHit>,
    pub elapsed_ms: f64,
    pub indexed_count: usize,
    pub root_path: String,
}

/// Fuzzy-matches `query_lower` against `target_lower`, returning (score, matched char indices).
/// Rewards consecutive runs, word-boundary starts, prefix matches, and shorter names.
fn fuzzy_score(name: &str, name_lower: &str, query_lower: &str) -> Option<(i32, Vec<usize>)> {
    if query_lower.is_empty() {
        return Some((0, Vec::new()));
    }

    let q_chars: Vec<char> = query_lower.chars().collect();
    let t_chars: Vec<char> = name_lower.chars().collect();
    let orig_chars: Vec<char> = name.chars().collect();

    if q_chars.len() > t_chars.len() {
        return None;
    }

    let mut indices = Vec::with_capacity(q_chars.len());
    let mut qi = 0usize;
    let mut score = 0i32;
    let mut prev_match: Option<usize> = None;

    for (ti, &tc) in t_chars.iter().enumerate() {
        if qi < q_chars.len() && tc == q_chars[qi] {
            indices.push(ti);
            score += 10;

            if let Some(prev) = prev_match {
                if ti == prev + 1 {
                    score += 18; // consecutive match bonus
                }
            }
            if ti == 0 {
                score += 25; // prefix bonus
            } else {
                let prev_c = orig_chars[ti - 1];
                if matches!(prev_c, '/' | '_' | '-' | '.' | ' ')
                    || (orig_chars[ti].is_uppercase() && prev_c.is_lowercase())
                {
                    score += 14; // word/camelCase boundary bonus
                }
            }

            prev_match = Some(ti);
            qi += 1;
        }
    }

    if qi != q_chars.len() {
        return None;
    }

    // Prefer exact substring matches and shorter filenames
    if name_lower.contains(query_lower) {
        score += 30;
    }
    score -= (t_chars.len() as i32).min(60) / 3;

    Some((score, indices))
}

async fn ensure_index(state: &AppState, root: &PathBuf) -> Result<Vec<IndexedEntry>, AppError> {
    let key = root.to_string_lossy().into_owned();
    {
        let cache = state.search_cache.lock().await;
        if let Some(entries) = cache.get(&key) {
            return Ok(entries.clone());
        }
    }

    let root_clone = root.clone();
    let built = tokio::task::spawn_blocking(move || {
        let mut list = Vec::with_capacity(2048);
        for entry_res in WalkDir::new(&root_clone)
            .skip_hidden(false)
            .max_depth(8)
        {
            if list.len() >= MAX_INDEX_ENTRIES {
                break;
            }
            let Ok(entry) = entry_res else { continue };
            let path = entry.path();
            if path == root_clone {
                continue;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            // Skip heavy VCS/dependency internals to keep index snappy
            if matches!(name.as_str(), ".git" | "node_modules" | "target") {
                continue;
            }
            let parent_dir = path
                .parent()
                .map(|p| p.to_string_lossy().into_owned())
                .unwrap_or_default();
            let is_dir = entry.file_type().is_dir();
            let name_lower = name.to_lowercase();
            list.push(IndexedEntry {
                name,
                name_lower,
                path: path.to_string_lossy().into_owned(),
                parent_dir,
                is_dir,
            });
        }
        list
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?;

    let mut cache = state.search_cache.lock().await;
    if cache.len() >= 4 {
        cache.clear();
    }
    cache.insert(key, built.clone());
    Ok(built)
}

pub async fn fuzzy_search(
    state: &AppState,
    root: PathBuf,
    query: String,
    limit: usize,
    force_reindex: bool,
) -> Result<SearchResponse, AppError> {
    let key = root.to_string_lossy().into_owned();
    if force_reindex {
        let mut cache = state.search_cache.lock().await;
        cache.remove(&key);
    }

    let entries = ensure_index(state, &root).await?;
    let indexed_count = entries.len();
    let started = Instant::now();
    let query_lower = query.trim().to_lowercase();

    let mut hits: Vec<SearchHit> = if query_lower.is_empty() {
        entries
            .iter()
            .take(limit)
            .map(|e| SearchHit {
                name: e.name.clone(),
                path: e.path.clone(),
                parent_dir: e.parent_dir.clone(),
                is_dir: e.is_dir,
                score: 0,
                match_indices: Vec::new(),
            })
            .collect()
    } else {
        let mut scored = Vec::new();
        for e in &entries {
            if let Some((score, match_indices)) = fuzzy_score(&e.name, &e.name_lower, &query_lower) {
                scored.push(SearchHit {
                    name: e.name.clone(),
                    path: e.path.clone(),
                    parent_dir: e.parent_dir.clone(),
                    is_dir: e.is_dir,
                    score,
                    match_indices,
                });
            }
        }
        scored.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.name.len().cmp(&b.name.len())));
        scored.truncate(limit);
        scored
    };

    // Keep deterministic order when empty
    if query_lower.is_empty() {
        hits.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name)));
    }

    let elapsed_ms = started.elapsed().as_secs_f64() * 1000.0;

    Ok(SearchResponse {
        hits,
        elapsed_ms,
        indexed_count,
        root_path: key,
    })
}

pub async fn invalidate_cache(state: &AppState) {
    let mut cache: tokio::sync::MutexGuard<'_, HashMap<String, Vec<IndexedEntry>>> =
        state.search_cache.lock().await;
    cache.clear();
}
