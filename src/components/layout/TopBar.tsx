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
  Keyboard,
  LayoutGrid,
  List,
  Palette,
  PanelRight,
  PieChart,
  Pin,
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
  onOpenThemeModal: () => void;
  onOpenShortcutsModal: () => void;
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
  onOpenThemeModal,
  onOpenShortcutsModal,
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
          title="Parent Directory"
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
                    className={`px-1.5 py-0.5 rounded hover:bg-surface truncate max-w-[170px] transition ${
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
          title="New Folder"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
        <button
          onClick={onCreateFile}
          className="p-1.5 rounded-md hover:bg-surface text-main transition"
          title="New File"
        >
          <FilePlus className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-4 bg-subtle" />

      {/* View Modes */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onViewMode("grid")}
          className={`p-1.5 rounded-md transition ${
            viewMode === "grid" ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Grid View"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewMode("list")}
          className={`p-1.5 rounded-md transition ${
            viewMode === "list" ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Detailed List View"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewMode("column")}
          className={`p-1.5 rounded-md transition ${
            viewMode === "column" ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Column View"
        >
          <Columns3 className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-4 bg-subtle" />

      {/* Tools + Theme Switcher */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggleSplit}
          className={`p-1.5 rounded-md transition ${
            splitView ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Toggle Dual-Pane Split View (Ctrl+\)"
        >
          <Columns2 className="w-4 h-4" />
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
          title="Disk Usage Breakdown"
        >
          <PieChart className="w-4 h-4" />
        </button>
        <button
          onClick={onTogglePreview}
          className={`p-1.5 rounded-md transition ${
            showPreview ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface hover:text-main"
          }`}
          title="Quick Preview (Space)"
        >
          <PanelRight className="w-4 h-4" />
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
