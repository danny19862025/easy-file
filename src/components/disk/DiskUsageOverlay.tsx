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
  "bg-accent",
  "bg-secondary",
  "bg-success",
  "bg-warning",
  "bg-danger",
  "bg-folder",
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
    <div
      className="fixed inset-0 z-50 bg-crust/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-subtle flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-main">Disk Usage Breakdown</h2>
            <p className="text-xs font-mono text-muted truncate max-w-lg">{path}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-main"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted">
              Scanning directory tree in parallel…
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
              {error}
            </div>
          ) : report ? (
            <>
              <div className="flex items-center justify-between text-xs text-muted pb-2 border-b border-subtle">
                <span>
                  Total: <strong className="text-main">{formatBytes(report.totalBytes)}</strong>
                </span>
                <span>{report.itemCount.toLocaleString()} items scanned</span>
              </div>

              <div className="h-3 w-full rounded-full bg-surface overflow-hidden flex">
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
                    className="w-full text-left p-2 rounded-lg hover:bg-surface/80 transition"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {entry.isDir ? (
                          <Folder className="w-4 h-4 text-folder shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted shrink-0" />
                        )}
                        <span className="truncate text-main">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-muted">
                        <span>{formatBytes(entry.size)}</span>
                        <span className="w-12 text-right">{entry.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
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
