import React, { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import {
  FileText,
  Folder,
  Link2,
  Plus,
  X,
  Image as ImageIcon,
  Film,
  Music,
  FileCode2,
} from "lucide-react";
import { FileEntry, ViewMode } from "../../types/fs";
import { PaneState } from "../../stores/useWorkspaceStore";
import { useDirectoryStream } from "../../hooks/useDirectoryStream";
import { baseName, formatBytes, formatDate, formatMode, localFileUrl } from "../../lib/format";

interface ExplorerPaneProps {
  pane: PaneState;
  isActive: boolean;
  viewMode: ViewMode;
  showHidden: boolean;
  onActivate: () => void;
  onNavigate: (path: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  onSelectPaths: (paths: string[]) => void;
  onActiveEntryChange: (entry: FileEntry | null) => void;
  onDropEntries: (sources: string[], destDir: string) => void;
}

function EntryIcon({ entry, size = "md" }: { entry: FileEntry; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-4 h-4 shrink-0" : "w-11 h-11";
  if (entry.isDir) {
    return <Folder className={`${cls} text-blue-400 fill-blue-400/20`} />;
  }
  if (entry.mimeType?.startsWith("image/")) {
    return <ImageIcon className={`${cls} text-emerald-400`} />;
  }
  if (entry.mimeType?.startsWith("video/")) {
    return <Film className={`${cls} text-purple-400`} />;
  }
  if (entry.mimeType?.startsWith("audio/")) {
    return <Music className={`${cls} text-pink-400`} />;
  }
  if (
    entry.extension &&
    ["rs", "ts", "tsx", "js", "jsx", "py", "go", "c", "cpp", "json", "toml"].includes(
      entry.extension
    )
  ) {
    return <FileCode2 className={`${cls} text-amber-400`} />;
  }
  return <FileText className={`${cls} text-zinc-400`} />;
}

export const ExplorerPane: React.FC<ExplorerPaneProps> = ({
  pane,
  isActive,
  viewMode,
  showHidden,
  onActivate,
  onNavigate,
  onAddTab,
  onCloseTab,
  onSelectTab,
  onSelectPaths,
  onActiveEntryChange,
  onDropEntries,
}) => {
  const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId) ?? pane.tabs[0];
  const { entries, isLoading, elapsedMs, error } = useDirectoryStream(
    pane.id,
    activeTab.path,
    showHidden
  );
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const listParentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 34,
    overscan: 16,
  });

  // Keep Quick Preview synced with active pane's primary selected entry
  useEffect(() => {
    if (!isActive) return;
    const primary = pane.selectedPaths[pane.selectedPaths.length - 1];
    const found = entries.find((e) => e.path === primary) ?? null;
    onActiveEntryChange(found);
  }, [isActive, pane.selectedPaths, entries, onActiveEntryChange]);

  const handleSelect = (e: React.MouseEvent, entry: FileEntry) => {
    onActivate();
    if (e.ctrlKey || e.metaKey) {
      const exists = pane.selectedPaths.includes(entry.path);
      const next = exists
        ? pane.selectedPaths.filter((p) => p !== entry.path)
        : [...pane.selectedPaths, entry.path];
      onSelectPaths(next);
    } else {
      onSelectPaths([entry.path]);
    }
  };

  const handleOpen = (entry: FileEntry) => {
    onActivate();
    if (entry.isDir) {
      onNavigate(entry.path);
    } else {
      invoke("open_with_default", { path: entry.path }).catch(() => {});
    }
  };

  const handleDragStart = (e: React.DragEvent, entry: FileEntry) => {
    const payload = pane.selectedPaths.includes(entry.path) ? pane.selectedPaths : [entry.path];
    e.dataTransfer.setData("application/x-easyfile-paths", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnTarget = (e: React.DragEvent, destDir: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);
    const raw = e.dataTransfer.getData("application/x-easyfile-paths");
    if (!raw) return;
    try {
      const paths: string[] = JSON.parse(raw);
      if (paths.length > 0 && !paths.includes(destDir)) {
        onDropEntries(paths, destDir);
      }
    } catch {
      // ignore invalid drag data
    }
  };

  return (
    <div
      onMouseDown={onActivate}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOverPath(activeTab.path);
      }}
      onDragLeave={() => setDragOverPath(null)}
      onDrop={(e) => handleDropOnTarget(e, activeTab.path)}
      className={`flex-1 flex flex-col min-w-0 min-h-0 border-r last:border-r-0 border-white/10 transition ${
        isActive ? "bg-zinc-950" : "bg-zinc-950/70 opacity-90"
      } ${dragOverPath === activeTab.path ? "ring-2 ring-inset ring-blue-500/40" : ""}`}
    >
      {/* Tab Strip */}
      <div className="h-9 shrink-0 px-2 border-b border-white/10 bg-zinc-900/40 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {pane.tabs.map((tab) => {
          const tabActive = tab.id === pane.activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-2.5 py-1 rounded-md text-xs cursor-pointer max-w-[180px] transition ${
                tabActive
                  ? "bg-white/10 text-zinc-100 font-medium"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{baseName(tab.path)}</span>
              {pane.tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={onAddTab}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/10 shrink-0"
          title="New Tab (Ctrl+T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="m-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Main View Surface */}
      {viewMode === "list" ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-1.5 border-b border-white/5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>Name</span>
            <div className="flex items-center gap-6 shrink-0">
              <span className="w-20 text-right">Size</span>
              <span className="w-36 text-right">Modified</span>
              <span className="w-12 text-right">Mode</span>
            </div>
          </div>
          <div ref={listParentRef} className="flex-1 overflow-y-auto px-2 py-1">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((vRow) => {
                const entry = entries[vRow.index];
                const selected = pane.selectedPaths.includes(entry.path);
                return (
                  <div
                    key={entry.path}
                    draggable
                    onDragStart={(e) => handleDragStart(e, entry)}
                    onDragOver={(e) => {
                      if (entry.isDir) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverPath(entry.path);
                      }
                    }}
                    onDrop={(e) => entry.isDir && handleDropOnTarget(e, entry.path)}
                    onClick={(e) => handleSelect(e, entry)}
                    onDoubleClick={() => handleOpen(entry)}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                    }}
                    className={`flex items-center justify-between px-2.5 rounded-md text-sm cursor-pointer transition ${
                      selected
                        ? "bg-blue-500/20 text-white"
                        : dragOverPath === entry.path
                        ? "bg-blue-500/30 ring-1 ring-blue-400"
                        : "hover:bg-white/5 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <EntryIcon entry={entry} size="sm" />
                      <span className={`truncate ${entry.isHidden ? "opacity-60" : ""}`}>
                        {entry.name}
                      </span>
                      {entry.isSymlink && (
                        <Link2 className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-6 shrink-0 text-xs text-zinc-500 font-mono">
                      <span className="w-20 text-right">{formatBytes(entry.size)}</span>
                      <span className="w-36 text-right font-sans">
                        {formatDate(entry.modifiedMs)}
                      </span>
                      <span className="w-12 text-right">
                        {formatMode(entry.permissionsOctal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : viewMode === "column" ? (
        <div className="flex-1 overflow-x-auto flex divide-x divide-white/10">
          <div className="w-64 shrink-0 overflow-y-auto p-1.5 space-y-0.5">
            {entries.map((entry) => {
              const selected = pane.selectedPaths.includes(entry.path);
              return (
                <button
                  key={entry.path}
                  onClick={(e) => handleSelect(e, entry)}
                  onDoubleClick={() => handleOpen(entry)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-sm text-left ${
                    selected ? "bg-blue-500/25 text-white" : "hover:bg-white/5 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <EntryIcon entry={entry} size="sm" />
                    <span className="truncate">{entry.name}</span>
                  </div>
                  {entry.isDir && <span className="text-zinc-500 text-xs">›</span>}
                </button>
              );
            })}
          </div>
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 p-6">
            Double-click any folder to step deeper, or press Space for Quick Preview.
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2">
            {entries.map((entry) => {
              const selected = pane.selectedPaths.includes(entry.path);
              const isImage = !entry.isDir && entry.mimeType?.startsWith("image/");
              return (
                <button
                  key={entry.path}
                  draggable
                  onDragStart={(e) => handleDragStart(e, entry)}
                  onDragOver={(e) => {
                    if (entry.isDir) {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverPath(entry.path);
                    }
                  }}
                  onDrop={(e) => entry.isDir && handleDropOnTarget(e, entry.path)}
                  onClick={(e) => handleSelect(e, entry)}
                  onDoubleClick={() => handleOpen(entry)}
                  className={`group flex flex-col items-center p-2.5 rounded-xl border transition text-center ${
                    selected
                      ? "bg-blue-500/20 border-blue-500/40"
                      : dragOverPath === entry.path
                      ? "bg-blue-500/25 border-blue-400"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="relative mb-2 w-14 h-14 flex items-center justify-center rounded-lg overflow-hidden">
                    {isImage ? (
                      <img
                        src={localFileUrl(entry.path)}
                        alt={entry.name}
                        loading="lazy"
                        className="w-14 h-14 object-cover rounded-lg bg-zinc-900"
                      />
                    ) : (
                      <EntryIcon entry={entry} size="md" />
                    )}
                    {entry.isSymlink && (
                      <Link2 className="w-3.5 h-3.5 text-amber-400 absolute bottom-0 right-0 bg-zinc-950 rounded-full p-0.5" />
                    )}
                  </div>
                  <span
                    className={`text-xs text-zinc-200 line-clamp-2 break-all ${
                      entry.isHidden ? "opacity-60" : ""
                    }`}
                  >
                    {entry.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pane Status Bar */}
      <footer className="h-7 shrink-0 px-3 border-t border-white/10 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-500">
        <span>
          {entries.length.toLocaleString()} items
          {pane.selectedPaths.length > 0 ? ` • ${pane.selectedPaths.length} selected` : ""}
        </span>
        <span>
          {isLoading ? "Scanning…" : elapsedMs !== null ? `Loaded in ${elapsedMs} ms` : ""}
        </span>
      </footer>
    </div>
  );
};
