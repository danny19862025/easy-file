import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Copy, ExternalLink, FileText, Folder, X } from "lucide-react";
import { FileEntry, PreviewData } from "../../types/fs";
import { formatBytes, formatDate, formatMode } from "../../lib/format";

interface QuickLookModalProps {
  entry: FileEntry | null;
  onClose: () => void;
}

export const QuickLookModal: React.FC<QuickLookModalProps> = ({ entry, onClose }) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setDimensions(null);
    if (!entry || entry.isDir) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    invoke<PreviewData>("read_preview", { path: entry.path })
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entry?.path, entry?.isDir]);

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-crust/75 backdrop-blur-md flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[86vh] rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-subtle flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-main truncate">{entry.name}</h2>
            <p className="text-[11px] text-muted font-mono truncate">{entry.path}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {preview?.kind === "text" && (
              <button
                onClick={() => navigator.clipboard?.writeText(preview.content).catch(() => {})}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-subtle bg-surface text-xs text-main hover:border-selected transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            )}
            {!entry.isDir && (
              <button
                onClick={() => invoke("open_with_default", { path: entry.path })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent text-crust text-xs font-semibold hover:opacity-90 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-main transition"
              title="Close (Space / Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 min-h-[280px] bg-crust overflow-auto flex items-center justify-center p-4">
          {entry.isDir ? (
            <div className="text-center space-y-2">
              <Folder className="w-20 h-20 text-folder fill-folder/20 mx-auto" />
              <p className="text-sm text-main font-medium">{entry.name}</p>
              <p className="text-xs text-muted">Directory</p>
            </div>
          ) : loading ? (
            <span className="text-sm text-muted">Loading Quick Look…</span>
          ) : preview?.kind === "image" ? (
            <img
              src={preview.url}
              alt={entry.name}
              onLoad={(e) =>
                setDimensions({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              className="max-h-[64vh] max-w-full object-contain rounded-lg shadow-lg"
            />
          ) : preview?.kind === "video" ? (
            <video
              controls
              autoPlay
              src={preview.url}
              onLoadedMetadata={(e) =>
                setDimensions({
                  w: e.currentTarget.videoWidth,
                  h: e.currentTarget.videoHeight,
                })
              }
              className="max-h-[64vh] max-w-full rounded-lg shadow-lg"
            />
          ) : preview?.kind === "audio" ? (
            <div className="w-full max-w-md p-6 rounded-xl border border-subtle bg-mantle space-y-3 text-center">
              <p className="text-sm font-medium text-main truncate">{entry.name}</p>
              <audio controls autoPlay src={preview.url} className="w-full" />
            </div>
          ) : preview?.kind === "pdf" ? (
            <iframe
              src={preview.url}
              title={entry.name}
              className="w-full h-[64vh] rounded-lg bg-white"
            />
          ) : preview?.kind === "text" ? (
            <pre className="w-full h-full max-h-[64vh] overflow-auto p-4 rounded-xl bg-base border border-subtle text-xs leading-relaxed font-mono text-main whitespace-pre-wrap break-words">
              {preview.content}
              {preview.truncated && "\n\n… (truncated at 128 KB)"}
            </pre>
          ) : (
            <div className="text-center space-y-2 p-8">
              <FileText className="w-16 h-16 text-muted mx-auto" />
              <p className="text-sm text-main">{entry.name}</p>
              <p className="text-xs text-muted">{preview?.mime ?? "Binary file"}</p>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <footer className="px-4 py-2.5 border-t border-subtle bg-mantle flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Size: <strong className="text-main">{formatBytes(entry.size)}</strong>
            </span>
            {dimensions && (
              <span>
                Resolution:{" "}
                <strong className="text-accent">
                  {dimensions.w} × {dimensions.h}
                </strong>
              </span>
            )}
            <span>
              Type: <strong className="text-main">{entry.mimeType ?? entry.kind}</strong>
            </span>
            <span>
              Modified: <strong className="text-main">{formatDate(entry.modifiedMs)}</strong>
            </span>
            <span className="font-mono">
              Mode: <strong className="text-main">{formatMode(entry.permissionsOctal)}</strong>
            </span>
          </div>
          <span className="text-[11px]">Press Space or Esc to close</span>
        </footer>
      </div>
    </div>
  );
};
