import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Clipboard,
  Copy,
  CopyCheck,
  ExternalLink,
  Eye,
  FilePlus,
  FolderOpen,
  FolderPlus,
  Layers,
  Pencil,
  PieChart,
  Pin,
  RefreshCw,
  Scissors,
  Search,
  Terminal,
  Trash2,
  XCircle,
} from "lucide-react";
import { FileEntry } from "../../types/fs";

export interface ContextMenuState {
  x: number;
  y: number;
  paneId: string;
  dirPath: string;
  entry: FileEntry | null;
}

interface ContextMenuProps {
  menu: ContextMenuState;
  hasClipboard: boolean;
  isPinned: boolean;
  onClose: () => void;
  onOpen: (entry: FileEntry) => void;
  onOpenInNewTab: (path: string) => void;
  onPreview: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: (destDir: string) => void;
  onCopyPath: (path: string) => void;
  onParkInShelf: () => void;
  onRename: () => void;
  onTogglePin: (path: string) => void;
  onTrash: () => void;
  onDeletePermanent: () => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onRefresh: () => void;
  onOpenTerminal: () => void;
  onDiskUsage: () => void;
}

interface ActionDef {
  id: string;
  label: string;
  keywords: string;
  shortcut?: string;
  icon: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  action: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  menu,
  hasClipboard,
  isPinned,
  onClose,
  onOpen,
  onOpenInNewTab,
  onPreview,
  onCut,
  onCopy,
  onPaste,
  onCopyPath,
  onParkInShelf,
  onRename,
  onTogglePin,
  onTrash,
  onDeletePermanent,
  onCreateFolder,
  onCreateFile,
  onRefresh,
  onOpenTerminal,
  onDiskUsage,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);

  const actions = useMemo<ActionDef[]>(() => {
    if (menu.entry) {
      const entry = menu.entry;
      const list: ActionDef[] = [
        {
          id: "open",
          label: "Open",
          keywords: "open launch enter",
          shortcut: "Enter",
          icon: entry.isDir ? (
            <FolderOpen className="w-3.5 h-3.5" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5" />
          ),
          action: () => onOpen(entry),
        },
        ...(entry.isDir
          ? [
              {
                id: "open-tab",
                label: "Open in New Tab",
                keywords: "tab new folder",
                icon: <FolderPlus className="w-3.5 h-3.5" />,
                action: () => onOpenInNewTab(entry.path),
              },
            ]
          : []),
        {
          id: "preview",
          label: "Quick Look Preview",
          keywords: "preview inspect quick look space",
          shortcut: "Space",
          icon: <Eye className="w-3.5 h-3.5" />,
          action: onPreview,
        },
        {
          id: "cut",
          label: "Cut",
          keywords: "cut move clipboard",
          shortcut: "Ctrl+X",
          icon: <Scissors className="w-3.5 h-3.5" />,
          action: onCut,
        },
        {
          id: "copy",
          label: "Copy",
          keywords: "copy duplicate clipboard",
          shortcut: "Ctrl+C",
          icon: <Copy className="w-3.5 h-3.5" />,
          action: onCopy,
        },
        ...(entry.isDir
          ? [
              {
                id: "paste-into",
                label: "Paste Into Folder",
                keywords: "paste clipboard",
                shortcut: "Ctrl+V",
                disabled: !hasClipboard,
                icon: <Clipboard className="w-3.5 h-3.5" />,
                action: () => onPaste(entry.path),
              },
            ]
          : []),
        {
          id: "copy-path",
          label: "Copy Full Path",
          keywords: "copy path location address",
          icon: <CopyCheck className="w-3.5 h-3.5" />,
          action: () => onCopyPath(entry.path),
        },
        {
          id: "shelf",
          label: "Park in Drop Shelf",
          keywords: "shelf park drop zone hold",
          icon: <Layers className="w-3.5 h-3.5" />,
          action: onParkInShelf,
        },
        {
          id: "rename",
          label: "Rename",
          keywords: "rename edit name",
          shortcut: "F2",
          icon: <Pencil className="w-3.5 h-3.5" />,
          action: onRename,
        },
        ...(entry.isDir
          ? [
              {
                id: "pin",
                label: isPinned ? "Unpin from Sidebar" : "Pin to Sidebar",
                keywords: "pin favorite bookmark sidebar",
                icon: <Pin className="w-3.5 h-3.5" />,
                action: () => onTogglePin(entry.path),
              },
            ]
          : []),
        {
          id: "trash",
          label: "Move to Trash",
          keywords: "trash delete remove recycle",
          shortcut: "Del",
          danger: true,
          icon: <Trash2 className="w-3.5 h-3.5" />,
          action: onTrash,
        },
        {
          id: "delete-perm",
          label: "Delete Permanently",
          keywords: "delete permanent destroy shred",
          shortcut: "Shift+Del",
          danger: true,
          icon: <XCircle className="w-3.5 h-3.5" />,
          action: onDeletePermanent,
        },
      ];
      return list;
    }

    return [
      {
        id: "new-folder",
        label: "New Folder",
        keywords: "create new folder directory mkdir",
        shortcut: "Ctrl+Shift+N",
        icon: <FolderPlus className="w-3.5 h-3.5" />,
        action: onCreateFolder,
      },
      {
        id: "new-file",
        label: "New File",
        keywords: "create new file touch",
        shortcut: "Ctrl+Alt+N",
        icon: <FilePlus className="w-3.5 h-3.5" />,
        action: onCreateFile,
      },
      {
        id: "paste",
        label: "Paste Here",
        keywords: "paste clipboard",
        shortcut: "Ctrl+V",
        disabled: !hasClipboard,
        icon: <Clipboard className="w-3.5 h-3.5" />,
        action: () => onPaste(menu.dirPath),
      },
      {
        id: "refresh",
        label: "Refresh Directory",
        keywords: "refresh reload rescan",
        shortcut: "F5",
        icon: <RefreshCw className="w-3.5 h-3.5" />,
        action: onRefresh,
      },
      {
        id: "terminal",
        label: "Open Terminal Here",
        keywords: "terminal shell console bash",
        shortcut: "Ctrl+`",
        icon: <Terminal className="w-3.5 h-3.5" />,
        action: onOpenTerminal,
      },
      {
        id: "disk",
        label: "Disk Usage Breakdown",
        keywords: "disk space storage analyzer size",
        shortcut: "Ctrl+D",
        icon: <PieChart className="w-3.5 h-3.5" />,
        action: onDiskUsage,
      },
      {
        id: "pin-dir",
        label: isPinned ? "Unpin Current Folder" : "Pin Current Folder",
        keywords: "pin favorite bookmark sidebar",
        icon: <Pin className="w-3.5 h-3.5" />,
        action: () => onTogglePin(menu.dirPath),
      },
    ];
  }, [
    menu,
    hasClipboard,
    isPinned,
    onOpen,
    onOpenInNewTab,
    onPreview,
    onCut,
    onCopy,
    onPaste,
    onCopyPath,
    onParkInShelf,
    onRename,
    onTogglePin,
    onTrash,
    onDeletePermanent,
    onCreateFolder,
    onCreateFile,
    onRefresh,
    onOpenTerminal,
    onDiskUsage,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.keywords.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  const execute = (item?: ActionDef) => {
    if (!item || item.disabled) return;
    item.action();
    onClose();
  };

  const left = Math.min(menu.x, window.innerWidth - 260);
  const top = Math.min(menu.y, window.innerHeight - 360);

  return (
    <div
      ref={ref}
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 w-64 rounded-xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      {/* Search Filter Input */}
      <div className="px-2.5 py-2 border-b border-subtle flex items-center gap-2 bg-base/70">
        <Search className="w-3.5 h-3.5 text-muted shrink-0" />
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
              setHighlightIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              execute(filtered[highlightIdx]);
            }
          }}
          placeholder="Filter actions…"
          className="w-full bg-transparent text-xs text-main placeholder:text-muted outline-none"
        />
      </div>

      {/* Filtered Actions */}
      <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="px-2.5 py-4 text-center text-xs text-muted">No matching actions</div>
        ) : (
          filtered.map((item, idx) => {
            const active = idx === highlightIdx;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={() => execute(item)}
                className={`w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-xs transition ${
                  item.disabled
                    ? "opacity-40 cursor-not-allowed text-muted"
                    : item.danger
                    ? active
                      ? "bg-danger/20 text-danger"
                      : "text-danger hover:bg-danger/15"
                    : active
                    ? "bg-accent/20 text-main font-medium"
                    : "text-main hover:bg-surface"
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span className={item.danger ? "text-danger" : active ? "text-accent" : "text-muted"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-muted shrink-0">{item.shortcut}</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
