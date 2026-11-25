import React, { useEffect, useState } from "react";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Columns3,
  Eye,
  EyeOff,
  FilePlus,
  FolderPlus,
  LayoutGrid,
  List,
  PanelRight,
  PieChart,
  Pin,
  Terminal,
} from "lucide-react";
import { ViewMode } from "../../types/fs";
import { parentPath } from "../../lib/format";

interface TopBarProps {
  currentPath: string;
  canBack: boolean;
  canForward: boolean;
  isPinned: boolean;
  viewMode: ViewMode;
  splitView: boolean;
  showHidden: boolean;
  showPreview: boolean;
  showTerminal: boolean;
  showDiskUsage: boolean;
  onBack: () => void;
  onForward: () => void;
  onNavigate: (path: string) => void;
  onTogglePin: () => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onViewMode: (mode: ViewMode) => void;
  onToggleSplit: () => void;
  onToggleHidden: () => void;
  onTogglePreview: () => void;
  onToggleTerminal: () => void;
  onToggleDiskUsage: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPath,
  canBack,
  canForward,
  isPinned,
  viewMode,
  splitView,
  showHidden,
  showPreview,
  showTerminal,
  showDiskUsage,
  onBack,
  onForward,
  onNavigate,
  onTogglePin,
  onCreateFolder,
  onCreateFile,
  onViewMode,
  onToggleSplit,
  onToggleHidden,
  onTogglePreview,
  onToggleTerminal,
  onToggleDiskUsage,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentPath);

  useEffect(() => {
    setDraft(currentPath);
    setEditing(false);
  }, [currentPath]);

  const segments = currentPath.split("/").filter(Boolean);

  return (
    <header className="h-12 shrink-0 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md px-3 flex items-center gap-2">
      {/* History Navigation */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onBack}
          disabled={!canBack}
          className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 text-zinc-300"
          title="Back (Alt+Left)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onForward}
          disabled={!canForward}
          className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 text-zinc-300"
          title="Forward (Alt+Right)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigate(parentPath(currentPath))}
          className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300"
          title="Parent Directory"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>

      {/* Editable Breadcrumbs */}
      <div
        className="flex-1 h-8 px-2.5 rounded-lg bg-zinc-950/75 border border-white/10 focus-within:border-blue-500/50 flex items-center justify-between overflow-hidden cursor-text"
        onClick={() => {
          if (!editing) {
            setDraft(currentPath);
            setEditing(true);
          }
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onNavigate(draft.trim() || "/");
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full bg-transparent text-sm text-zinc-100 outline-none font-mono"
          />
        ) : (
          <div className="flex items-center gap-0.5 text-sm text-zinc-300 overflow-x-auto no-scrollbar">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("/");
              }}
              className="px-1.5 py-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-100"
            >
              /
            </button>
            {segments.map((seg, i) => {
              const target = "/" + segments.slice(0, i + 1).join("/");
              const isLast = i === segments.length - 1;
              return (
                <React.Fragment key={target}>
                  <span className="text-zinc-600">/</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(target);
                    }}
                    className={`px-1.5 py-0.5 rounded hover:bg-white/10 truncate max-w-[170px] ${
                      isLast ? "text-zinc-100 font-medium" : "text-zinc-400"
                    }`}
                  >
                    {seg}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`ml-2 p-1 rounded hover:bg-white/10 ${
            isPinned ? "text-amber-400" : "text-zinc-500 hover:text-zinc-200"
          }`}
          title={isPinned ? "Unpin directory" : "Pin directory to Sidebar"}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Creation Actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onCreateFolder}
          className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300"
          title="New Folder"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
        <button
          onClick={onCreateFile}
          className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300"
          title="New File"
        >
          <FilePlus className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* View Modes */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onViewMode("grid")}
          className={`p-1.5 rounded-md ${
            viewMode === "grid" ? "bg-white/15 text-white" : "text-zinc-400 hover:bg-white/5"
          }`}
          title="Grid View"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewMode("list")}
          className={`p-1.5 rounded-md ${
            viewMode === "list" ? "bg-white/15 text-white" : "text-zinc-400 hover:bg-white/5"
          }`}
          title="Detailed List View"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewMode("column")}
          className={`p-1.5 rounded-md ${
            viewMode === "column" ? "bg-white/15 text-white" : "text-zinc-400 hover:bg-white/5"
          }`}
          title="Column View"
        >
          <Columns3 className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Tools */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggleSplit}
          className={`p-1.5 rounded-md ${
            splitView ? "bg-blue-500/25 text-blue-300" : "text-zinc-400 hover:bg-white/5"
          }`}
          title="Toggle Dual-Pane Split View (Ctrl+\)"
        >
          <Columns2 className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleHidden}
          className={`p-1.5 rounded-md ${
            showHidden ? "bg-white/15 text-white" : "text-zinc-400 hover:bg-white/5"
          }`}
          title="Toggle Hidden Files (Ctrl+H)"
        >
          {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onToggleDiskUsage}
          className={`p-1.5 rounded-md ${
            showDiskUsage ? "bg-blue-500/25 text-blue-300" : "text-zinc-400 hover:bg-white/5"
          }`}
          title="Disk Usage Breakdown"
        >
          <PieChart className="w-4 h-4" />
        </button>
        <button
          onClick={onTogglePreview}
          className={`p-1.5 rounded-md ${
            showPreview ? "bg-blue-500/25 text-blue-300" : "text-zinc-400 hover:bg-white/5"
          }`}
          title="Quick Preview (Space)"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleTerminal}
          className={`p-1.5 rounded-md ${
            showTerminal ? "bg-emerald-500/25 text-emerald-300" : "text-zinc-400 hover:bg-white/5"
          }`}
          title="Integrated Terminal (Ctrl+`)"
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
