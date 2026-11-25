import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileText, Folder, X } from "lucide-react";
import { DiskUsageReport } from "../../types/fs";
import { formatBytes } from "../../lib/format";

interface DiskUsageOverlayProps {
  path: string;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

const BAR_COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export const DiskUsageOverlay: React.FC<DiskUsageOverlayProps> = ({
  path,
  onNavigate,
  onClose,
}) => {
  const [report, setReport] = useState<DiskUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    invoke<DiskUsageReport>("analyze_disk_usage", { path })
      .then((res) => {
        if (active) setReport(res);
      })
      .catch((err) => {
        if (active) setError(String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Disk Usage Breakdown</h2>
            <p className="text-xs font-mono text-zinc-400 truncate max-w-lg">{path}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Scanning directory tree in parallel…
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {error}
            </div>
          ) : report ? (
            <>
              <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-white/10">
                <span>
                  Total: <strong className="text-zinc-100">{formatBytes(report.totalBytes)}</strong>
                </span>
                <span>{report.itemCount.toLocaleString()} items scanned</span>
              </div>

              {/* Stacked summary bar */}
              <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                {report.entries.slice(0, 8).map((entry, idx) => (
                  <div
                    key={entry.path}
                    className={`${BAR_COLORS[idx % BAR_COLORS.length]} h-full`}
                    style={{ width: `${Math.max(entry.percentage, 0.5)}%` }}
                    title={`${entry.name}: ${formatBytes(entry.size)}`}
                  />
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                {report.entries.map((entry, idx) => (
                  <button
                    key={entry.path}
                    onClick={() => {
                      if (entry.isDir) {
                        onNavigate(entry.path);
                        onClose();
                      }
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {entry.isDir ? (
                          <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                        <span className="truncate text-zinc-200">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-zinc-400">
                        <span>{formatBytes(entry.size)}</span>
                        <span className="w-12 text-right">{entry.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                        style={{ width: `${Math.max(entry.percentage, 0.5)}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
