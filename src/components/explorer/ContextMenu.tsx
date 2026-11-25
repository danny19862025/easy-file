import React, { useEffect, useRef } from "react";
import {
  Clipboard,
  Copy,
  Eye,
  FilePlus,
  FolderOpen,
  FolderPlus,
  Pencil,
  PieChart,
  Pin,
  RefreshCw,
  Scissors,
  Terminal,
  Trash2,
  XCircle,
  ExternalLink,
  CopyCheck,
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

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  shortcut,
  danger,
  disabled,
  onClick,
}) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-4 px-2.5 py-1.5 rounded-lg text-xs transition ${
      disabled
        ? "opacity-40 cursor-not-allowed text-muted"
        : danger
        ? "text-danger hover:bg-danger/15"
        : "text-main hover:bg-surface"
    }`}
  >
    <span className="flex items-center gap-2.5">
      <span className={danger ? "text-danger" : "text-muted"}>{icon}</span>
      <span>{label}</span>
    </span>
    {shortcut && <span className="text-[10px] font-mono text-muted">{shortcut}</span>}
  </button>
);

const Divider = () => <div className="my-1 border-t border-subtle/70" />;

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

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const left = Math.min(menu.x, window.innerWidth - 235);
  const top = Math.min(menu.y, window.innerHeight - (menu.entry ? 340 : 260));

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div
      ref={ref}
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 w-56 p-1.5 rounded-xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl"
    >
      {menu.entry ? (
        <>
          <MenuItem
            icon={
              menu.entry.isDir ? (
                <FolderOpen className="w-3.5 h-3.5" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )
            }
            label="Open"
            shortcut="Enter"
            onClick={run(() => onOpen(menu.entry!))}
          />
          {menu.entry.isDir && (
            <MenuItem
              icon={<FolderPlus className="w-3.5 h-3.5" />}
              label="Open in New Tab"
              onClick={run(() => onOpenInNewTab(menu.entry!.path))}
            />
          )}
          <MenuItem
            icon={<Eye className="w-3.5 h-3.5" />}
            label="Quick Preview"
            shortcut="Space"
            onClick={run(onPreview)}
          />

          <Divider />

          <MenuItem
            icon={<Scissors className="w-3.5 h-3.5" />}
            label="Cut"
            shortcut="Ctrl+X"
            onClick={run(onCut)}
          />
          <MenuItem
            icon={<Copy className="w-3.5 h-3.5" />}
            label="Copy"
            shortcut="Ctrl+C"
            onClick={run(onCopy)}
          />
          {menu.entry.isDir && (
            <MenuItem
              icon={<Clipboard className="w-3.5 h-3.5" />}
              label="Paste Into Folder"
              shortcut="Ctrl+V"
              disabled={!hasClipboard}
              onClick={run(() => onPaste(menu.entry!.path))}
            />
          )}
          <MenuItem
            icon={<CopyCheck className="w-3.5 h-3.5" />}
            label="Copy Path"
            onClick={run(() => onCopyPath(menu.entry!.path))}
          />

          <Divider />

          <MenuItem
            icon={<Pencil className="w-3.5 h-3.5" />}
            label="Rename"
            shortcut="F2"
            onClick={run(onRename)}
          />
          {menu.entry.isDir && (
            <MenuItem
              icon={<Pin className="w-3.5 h-3.5" />}
              label={isPinned ? "Unpin from Sidebar" : "Pin to Sidebar"}
              onClick={run(() => onTogglePin(menu.entry!.path))}
            />
          )}

          <Divider />

          <MenuItem
            icon={<Trash2 className="w-3.5 h-3.5" />}
            label="Move to Trash"
            shortcut="Del"
            danger
            onClick={run(onTrash)}
          />
          <MenuItem
            icon={<XCircle className="w-3.5 h-3.5" />}
            label="Delete Permanently"
            shortcut="Shift+Del"
            danger
            onClick={run(onDeletePermanent)}
          />
        </>
      ) : (
        <>
          <MenuItem
            icon={<FolderPlus className="w-3.5 h-3.5" />}
            label="New Folder"
            shortcut="Ctrl+Shift+N"
            onClick={run(onCreateFolder)}
          />
          <MenuItem
            icon={<FilePlus className="w-3.5 h-3.5" />}
            label="New File"
            shortcut="Ctrl+Alt+N"
            onClick={run(onCreateFile)}
          />
          <MenuItem
            icon={<Clipboard className="w-3.5 h-3.5" />}
            label="Paste"
            shortcut="Ctrl+V"
            disabled={!hasClipboard}
            onClick={run(() => onPaste(menu.dirPath))}
          />

          <Divider />

          <MenuItem
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            label="Refresh"
            shortcut="F5"
            onClick={run(onRefresh)}
          />
          <MenuItem
            icon={<Terminal className="w-3.5 h-3.5" />}
            label="Open Terminal Here"
            shortcut="Ctrl+`"
            onClick={run(onOpenTerminal)}
          />
          <MenuItem
            icon={<PieChart className="w-3.5 h-3.5" />}
            label="Disk Usage Breakdown"
            shortcut="Ctrl+D"
            onClick={run(onDiskUsage)}
          />
          <MenuItem
            icon={<Pin className="w-3.5 h-3.5" />}
            label={isPinned ? "Unpin Current Folder" : "Pin Current Folder"}
            onClick={run(() => onTogglePin(menu.dirPath))}
          />
        </>
      )}
    </div>
  );
};
