import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileText, Folder, RefreshCw, Search, X, Zap } from "lucide-react";

interface SearchHit {
  name: string;
  path: string;
  parentDir: string;
  isDir: boolean;
  score: number;
  matchIndices: number[];
}

interface SearchResponse {
  hits: SearchHit[];
  elapsedMs: number;
  indexedCount: number;
  rootPath: string;
}

interface FuzzySearchModalProps {
  rootPath: string;
  onSelectHit: (hit: SearchHit) => void;
  onClose: () => void;
}

function HighlightedName({ name, indices }: { name: string; indices: number[] }) {
  if (indices.length === 0) return <span>{name}</span>;
  const set = new Set(indices);
  return (
    <span>
      {Array.from(name).map((ch, idx) =>
        set.has(idx) ? (
          <mark
            key={idx}
            className="bg-accent/30 text-accent font-semibold rounded-xs px-[1px]"
          >
            {ch}
          </mark>
        ) : (
          <span key={idx}>{ch}</span>
        )
      )}
    </span>
  );
}

export const FuzzySearchModal: React.FC<FuzzySearchModalProps> = ({
  rootPath,
  onSelectHit,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = (q: string, forceReindex = false) => {
    setLoading(true);
    invoke<SearchResponse>("fuzzy_search", {
      root: rootPath,
      query: q,
      limit: 60,
      forceReindex,
    })
      .then((res) => {
        setResponse(res);
        setHighlightIdx(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    inputRef.current?.focus();
    const timer = setTimeout(() => runSearch(query), query ? 35 : 0);
    return () => clearTimeout(timer);
  }, [query, rootPath]);

  const hits = response?.hits ?? [];

  const handleChoose = (hit?: SearchHit) => {
    if (!hit) return;
    onSelectHit(hit);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-crust/70 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[74vh]"
      >
        {/* Search Input Bar */}
        <div className="px-4 py-3 border-b border-subtle flex items-center gap-3 bg-base/80">
          <Search className="w-4 h-4 text-accent shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIdx((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleChoose(hits[highlightIdx]);
              }
            }}
            placeholder={`Fuzzy search in ${rootPath}…`}
            className="flex-1 bg-transparent text-sm text-main placeholder:text-muted outline-none"
          />
          <button
            onClick={() => runSearch(query, true)}
            className="p-1.5 rounded-md hover:bg-surface text-muted hover:text-main transition"
            title="Rebuild Search Index"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : ""}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface text-muted hover:text-main transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {hits.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">
              {loading ? "Indexing directory…" : "No matching files or folders"}
            </div>
          ) : (
            hits.map((hit, idx) => {
              const active = idx === highlightIdx;
              return (
                <button
                  key={hit.path}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  onClick={() => handleChoose(hit)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-left transition ${
                    active
                      ? "bg-accent/15 border-selected text-main"
                      : "border-transparent hover:bg-surface/70 text-main/90"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {hit.isDir ? (
                      <Folder className="w-4 h-4 text-folder fill-folder/20 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm truncate">
                        <HighlightedName name={hit.name} indices={hit.matchIndices} />
                      </div>
                      <div className="text-[11px] text-muted font-mono truncate">
                        {hit.parentDir}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">
                    {hit.isDir ? "Folder" : "File"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Latency & Index Footer */}
        <footer className="px-4 py-2 border-t border-subtle bg-base/60 flex items-center justify-between text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-accent font-mono">
              <Zap className="w-3 h-3" />
              {response ? `${response.elapsedMs.toFixed(2)} ms` : "—"}
            </span>
            <span>
              {response ? `${response.indexedCount.toLocaleString()} indexed` : "Indexing…"}
            </span>
          </div>
          <span>↑↓ Navigate • Enter Open • Esc Close</span>
        </footer>
      </div>
    </div>
  );
};
