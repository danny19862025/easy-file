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
  onActiveEntriesChange: (entries: FileEntry[]) => void;
  onDropEntries: (sources: string[], destDir: string) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry | null, dirPath: string) => void;
  reloadSignal: number;
}

function EntryIcon({ entry, size = "md" }: { entry: FileEntry; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-4 h-4 shrink-0" : "w-11 h-11";
  if (entry.isDir) {
    return <Folder className={`${cls} text-folder fill-folder/20`} />;
  }
  if (entry.mimeType?.startsWith("image/")) {
    return <ImageIcon className={`${cls} text-success`} />;
  }
  if (entry.mimeType?.startsWith("video/")) {
    return <Film className={`${cls} text-secondary`} />;
  }
  if (entry.mimeType?.startsWith("audio/")) {
    return <Music className={`${cls} text-danger`} />;
  }
  if (
    entry.extension &&
    ["rs", "ts", "tsx", "js", "jsx", "py", "go", "c", "cpp", "json", "toml"].includes(
      entry.extension
    )
  ) {
    return <FileCode2 className={`${cls} text-warning`} />;
  }
  return <FileText className={`${cls} text-muted`} />;
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
  onActiveEntriesChange,
  onDropEntries,
  onContextMenu,
  reloadSignal,
}) => {
  const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId) ?? pane.tabs[0];
  const { entries, isLoading, elapsedMs, error, reload } = useDirectoryStream(
    pane.id,
    activeTab.path,
    showHidden
  );
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const listParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && reloadSignal > 0) {
      reload();
    }
  }, [isActive, reloadSignal]);

  useEffect(() => {
    if (isActive) {
      onActiveEntriesChange(entries);
    }
  }, [isActive, entries, onActiveEntriesChange]);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 36,
    overscan: 16,
  });

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

  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry | null) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate();
    if (entry && !pane.selectedPaths.includes(entry.path)) {
      onSelectPaths([entry.path]);
    }
    onContextMenu(e, entry, activeTab.path);
  };

  return (
    <div
      onMouseDown={onActivate}
      onContextMenu={(e) => handleContextMenu(e, null)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOverPath(activeTab.path);
      }}
      onDragLeave={() => setDragOverPath(null)}
      onDrop={(e) => handleDropOnTarget(e, activeTab.path)}
      className={`flex-1 flex flex-col min-w-0 min-h-0 border-r last:border-r-0 border-subtle transition ${
        isActive ? "bg-base" : "bg-base/85 opacity-90"
      } ${dragOverPath === activeTab.path ? "ring-2 ring-inset ring-selected/60" : ""}`}
    >
      {/* Tab Strip */}
      <div className="h-9 shrink-0 px-2 border-b border-subtle bg-mantle/60 backdrop-blur-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
        {pane.tabs.map((tab) => {
          const tabActive = tab.id === pane.activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border cursor-pointer max-w-[180px] transition ${
                tabActive
                  ? "bg-surface border-selected/60 text-main font-medium"
                  : "border-transparent text-muted hover:bg-surface/60 hover:text-main"
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-folder shrink-0" />
              <span className="truncate">{baseName(tab.path)}</span>
              {pane.tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-base/60"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={onAddTab}
          className="p-1 rounded-md text-muted hover:text-main hover:bg-surface shrink-0 transition"
          title="New Tab (Ctrl+T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="m-3 p-3 rounded-lg border border-danger/40 bg-danger/10 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Main View Surface */}
      {viewMode === "list" ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-1.5 border-b border-subtle/60 text-[11px] font-medium uppercase tracking-wider text-muted flex items-center justify-between">
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
                    onContextMenu={(e) => handleContextMenu(e, entry)}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                    }}
                    className={`flex items-center justify-between px-2.5 rounded-lg border text-sm cursor-pointer transition ${
                      selected
                        ? "bg-accent/15 border-selected text-main font-medium"
                        : dragOverPath === entry.path
                        ? "bg-accent/25 border-selected"
                        : "border-transparent hover:bg-surface/80 hover:border-selected/50 text-main/90"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <EntryIcon entry={entry} size="sm" />
                      <span className={`truncate ${entry.isHidden ? "opacity-60" : ""}`}>
                        {entry.name}
                      </span>
                      {entry.isSymlink && (
                        <Link2 className="w-3 h-3 text-warning shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-6 shrink-0 text-xs text-muted font-mono">
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
        <div className="flex-1 overflow-x-auto flex divide-x divide-subtle">
          <div className="w-64 shrink-0 overflow-y-auto p-1.5 space-y-0.5">
            {entries.map((entry) => {
              const selected = pane.selectedPaths.includes(entry.path);
              return (
                <button
                  key={entry.path}
                  onClick={(e) => handleSelect(e, entry)}
                  onDoubleClick={() => handleOpen(entry)}
                  onContextMenu={(e) => handleContextMenu(e, entry)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-sm text-left transition ${
                    selected
                      ? "bg-accent/15 border-selected text-main"
                      : "border-transparent hover:bg-surface/80 text-main/90"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <EntryIcon entry={entry} size="sm" />
                    <span className="truncate">{entry.name}</span>
                  </div>
                  {entry.isDir && <span className="text-muted text-xs">›</span>}
                </button>
              );
            })}
          </div>
          <div className="flex-1 flex items-center justify-center text-xs text-muted p-6">
            Double-click any folder to step deeper, or press Space for Quick Preview.
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(122px,1fr))] gap-2.5">
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
                  onContextMenu={(e) => handleContextMenu(e, entry)}
                  className={`group item-hover-glow flex flex-col items-center p-2.5 rounded-xl border transition text-center ${
                    selected
                      ? "bg-accent/15 border-selected shadow-sm"
                      : dragOverPath === entry.path
                      ? "bg-accent/25 border-selected"
                      : "bg-mantle/40 border-subtle/40 hover:bg-surface/85 hover:border-selected"
                  }`}
                >
                  <div className="relative mb-2 w-14 h-14 flex items-center justify-center rounded-lg overflow-hidden">
                    {isImage ? (
                      <img
                        src={localFileUrl(entry.path)}
                        alt={entry.name}
                        loading="lazy"
                        className="w-14 h-14 object-cover rounded-lg bg-crust"
                      />
                    ) : (
                      <EntryIcon entry={entry} size="md" />
                    )}
                    {entry.isSymlink && (
                      <Link2 className="w-3.5 h-3.5 text-warning absolute bottom-0 right-0 bg-crust rounded-full p-0.5" />
                    )}
                  </div>
                  <span
                    className={`text-xs text-main line-clamp-2 break-all ${
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
      <footer className="h-7 shrink-0 px-3 border-t border-subtle bg-mantle/60 flex items-center justify-between text-[11px] text-muted">
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
