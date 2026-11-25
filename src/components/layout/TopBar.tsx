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
  FolderTree,
  Keyboard,
  Layers,
  LayoutGrid,
  List,
  Palette,
  PieChart,
  Pin,
  Search,
  TableProperties,
  Terminal,
} from "lucide-react";
import { ViewMode } from "../../types/fs";
import { parentPath } from "../../lib/format";
import { useTheme } from "../../context/ThemeContext";

interface TopBarProps {
  currentPath: string;
  canBack: boolean;
  canForward: boolean;
  isPinned: boolean;
  viewMode: ViewMode;
  splitView: boolean;
  showHidden: boolean;
  showQuickLook: boolean;
  showTerminal: boolean;
  showDiskUsage: boolean;
  showShelf: boolean;
  shelfCount: number;
  onBack: () => void;
  onForward: () => void;
  onNavigate: (path: string) => void;
  onTogglePin: () => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onViewMode: (mode: ViewMode) => void;
  onToggleSplit: () => void;
  onToggleHidden: () => void;
  onToggleQuickLook: () => void;
  onToggleTerminal: () => void;
  onToggleDiskUsage: () => void;
  onToggleShelf: () => void;
  onOpenThemeModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenSearchModal: () => void;
  focusPathSignal: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPath,
  canBack,
  canForward,
  isPinned,
  viewMode,
  splitView,
  showHidden,
  showQuickLook,
  showTerminal,
  showDiskUsage,
  showShelf,
  shelfCount,
  onBack,
  onForward,
  onNavigate,
  onTogglePin,
  onCreateFolder,
  onCreateFile,
  onViewMode,
  onToggleSplit,
  onToggleHidden,
  onToggleQuickLook,
  onToggleTerminal,
  onToggleDiskUsage,
  onToggleShelf,
  onOpenThemeModal,
  onOpenShortcutsModal,
  onOpenSearchModal,
  focusPathSignal,
}) => {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentPath);

  useEffect(() => {
    setDraft(currentPath);
    setEditing(false);
  }, [currentPath]);

  useEffect(() => {
    if (focusPathSignal > 0) {
      setDraft(currentPath);
      setEditing(true);
    }
  }, [focusPathSignal, currentPath]);

  const segments = currentPath.split("/").filter(Boolean);

  return (
    <header className="h-12 shrink-0 border-b border-subtle bg-mantle/80 backdrop-blur-md px-3 flex items-center gap-2">
      {/* History Navigation */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onBack}
          disabled={!canBack}
          className="p-1.5 rounded-md hover:bg-surface disabled:opacity-30 text-main transition"
          title="Back (Alt+Left)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onForward}
          disabled={!canForward}
          className="p-1.5 rounded-md hover:bg-surface disabled:opacity-30 text-main transition"
          title="Forward (Alt+Right)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigate(parentPath(currentPath))}
          className="p-1.5 rounded-md hover:bg-surface text-main transition"
          title="Parent Directory (Alt+Up)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>

      {/* Editable Breadcrumbs */}
      <div
        className="flex-1 h-8 px-2.5 rounded-lg bg-base/85 border border-subtle focus-within:border-selected flex items-center justify-between overflow-hidden cursor-text transition"
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
            className="w-full bg-transparent text-sm text-main outline-none font-mono"
          />
        ) : (
          <div className="flex items-center gap-0.5 text-sm text-muted overflow-x-auto no-scrollbar">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("/");
              }}
              className="px-1.5 py-0.5 rounded hover:bg-surface text-muted hover:text-main transition"
            >
              /
            </button>
            {segments.map((seg, i) => {
              const target = "/" + segments.slice(0, i + 1).join("/");
              const isLast = i === segments.length - 1;
              return (
                <React.Fragment key={target}>
                  <span className="text-subtle">/</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(target);
                    }}
                    className={`px-1.5 py-0.5 rounded hover:bg-surface truncate max-w-[160px] transition ${
                      isLast ? "text-main font-medium" : "text-muted hover:text-main"
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
          className={`ml-2 p-1 rounded hover:bg-surface transition ${
            isPinned ? "text-warning" : "text-muted hover:text-main"
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
          className="p-1.5 rounded-md hover:bg-surface text-main transition"
          title="New Folder (Ctrl+Shift+N)"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
        <button
          onClick={onCreateFile}
          className="p-1.5 rounded-md hover:bg-surface text-main transition"
          title="New File (Ctrl+Alt+N)"
        >
          <FilePlus className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-4 bg-subtle" />

      {/* 5 Multi-Layout View Modes (per active pane) */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onViewMode("grid")}
          className={`p-1.5 rounded-md transition ${
            viewMode === "grid" ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Grid View (Ctrl+1)"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewMode("list")}
          className={`p-1.5 rounded-md transition ${
            viewMode === "list" ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Compact List View (Ctrl+2)"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewMode("details")}
          className={`p-1.5 rounded-md transition ${
            viewMode === "details" ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Details Table View (Ctrl+3)"
        >
          <TableProperties className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewMode("miller")}
          className={`p-1.5 rounded-md transition ${
            viewMode === "miller" ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Miller Columns View (Ctrl+4)"
        >
          <Columns3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewMode("tree")}
          className={`p-1.5 rounded-md transition ${
            viewMode === "tree" ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Tree Hierarchy View (Ctrl+5)"
        >
          <FolderTree className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-4 bg-subtle" />

      {/* Tools, Shelf & Theme Switcher */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggleSplit}
          className={`p-1.5 rounded-md transition ${
            splitView ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Dual-Pane Split View (Ctrl+\)"
        >
          <Columns2 className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleShelf}
          className={`relative p-1.5 rounded-md transition ${
            showShelf ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Drop Zone Shelf (Ctrl+B)"
        >
          <Layers className="w-4 h-4" />
          {shelfCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-accent text-crust text-[9px] font-bold flex items-center justify-center">
              {shelfCount}
            </span>
          )}
        </button>
        <button
          onClick={onToggleHidden}
          className={`p-1.5 rounded-md transition ${
            showHidden ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Toggle Hidden Files (Ctrl+H)"
        >
          {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onToggleDiskUsage}
          className={`p-1.5 rounded-md transition ${
            showDiskUsage ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Disk Usage Breakdown (Ctrl+D)"
        >
          <PieChart className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenSearchModal}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-subtle bg-surface/60 hover:bg-surface hover:border-selected text-xs text-main transition"
          title="Instant Fuzzy Search (Ctrl+F or /)"
        >
          <Search className="w-3.5 h-3.5 text-accent" />
          <span className="hidden lg:inline text-muted">Search</span>
        </button>
        <button
          onClick={onToggleTerminal}
          className={`p-1.5 rounded-md transition ${
            showTerminal ? "bg-success/20 text-success" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Integrated Terminal (Ctrl+`)"
        >
          <Terminal className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-subtle mx-0.5" />

        <button
          onClick={onOpenShortcutsModal}
          className="p-1.5 rounded-md text-muted hover:bg-surface hover:text-main transition"
          title="Keyboard Shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenThemeModal}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-subtle bg-surface/60 hover:bg-surface hover:border-selected text-xs text-main transition"
          title={`Theme: ${theme.name} (Ctrl+,)`}
        >
          <Palette className="w-3.5 h-3.5 text-secondary" />
          <span className="hidden xl:inline">{theme.name}</span>
        </button>
      </div>
    </header>
  );
};
