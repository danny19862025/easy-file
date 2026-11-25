import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ExternalLink, FileText, Folder, X } from "lucide-react";
import { FileEntry, PreviewData } from "../../types/fs";
import { formatBytes, formatDate, formatMode } from "../../lib/format";

interface QuickPreviewPanelProps {
  entry: FileEntry | null;
  onClose: () => void;
}

export const QuickPreviewPanel: React.FC<QuickPreviewPanelProps> = ({ entry, onClose }) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

  return (
    <aside className="w-80 shrink-0 border-l border-white/10 bg-zinc-900/75 backdrop-blur-xl flex flex-col overflow-hidden">
      <div className="h-10 px-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Quick Preview
        </span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-zinc-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!entry ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-zinc-500">
          Select any file and press Space to inspect its contents.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Preview Viewport */}
          <div className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden min-h-[160px] flex items-center justify-center">
            {entry.isDir ? (
              <Folder className="w-16 h-16 text-blue-400/80" />
            ) : loading ? (
              <span className="text-xs text-zinc-500">Loading preview…</span>
            ) : preview?.kind === "image" ? (
              <img
                src={preview.url}
                alt={entry.name}
                className="max-h-64 w-full object-contain"
              />
            ) : preview?.kind === "audio" ? (
              <div className="w-full p-4">
                <audio controls src={preview.url} className="w-full" />
              </div>
            ) : preview?.kind === "pdf" ? (
              <iframe src={preview.url} title={entry.name} className="w-full h-64 bg-white" />
            ) : preview?.kind === "text" ? (
              <pre className="w-full max-h-72 overflow-auto p-3 text-[11px] leading-relaxed font-mono text-zinc-300 whitespace-pre-wrap break-all">
                {preview.content}
                {preview.truncated && "\n\n… (truncated at 128 KB)"}
              </pre>
            ) : (
              <div className="p-6 text-center space-y-2">
                <FileText className="w-10 h-10 text-zinc-500 mx-auto" />
                <p className="text-xs text-zinc-500">{preview?.mime ?? "Binary file"}</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-zinc-100 break-all">{entry.name}</p>
              {!entry.isDir && (
                <button
                  onClick={() => invoke("open_with_default", { path: entry.path })}
                  className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 shrink-0"
                  title="Open with default Linux application"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <dl className="text-xs text-zinc-400 space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Type</dt>
                <dd className="truncate max-w-[160px]">{entry.mimeType ?? entry.kind}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Size</dt>
                <dd>{formatBytes(entry.size)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Modified</dt>
                <dd>{formatDate(entry.modifiedMs)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Permissions</dt>
                <dd className="font-mono">{formatMode(entry.permissionsOctal)}</dd>
              </div>
              {entry.symlinkTarget && (
                <div className="flex flex-col gap-0.5 pt-1">
                  <dt className="text-zinc-500">Symlink Target</dt>
                  <dd className="font-mono text-[11px] text-amber-300 break-all">
                    {entry.symlinkTarget}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </aside>
  );
};
