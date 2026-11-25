import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { FileEntry } from "../../types/fs";
import { readDirOnce } from "../../lib/readDirOnce";
import { formatBytes, formatDate, formatMode } from "../../lib/format";
import { EntryIcon } from "./EntryIcon";

interface TreeViewProps {
  rootPath: string;
  entries: FileEntry[];
  selectedPaths: string[];
  showHidden: boolean;
  onSelect: (e: React.MouseEvent, entry: FileEntry) => void;
  onOpen: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onDragStart: (e: React.DragEvent, entry: FileEntry) => void;
  onDropOnDir: (e: React.DragEvent, destDir: string) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  rootPath,
  entries,
  selectedPaths,
  showHidden,
  onSelect,
  onOpen,
  onContextMenu,
  onDragStart,
  onDropOnDir,
}) => {
  const [expanded, setExpanded] = useState<Record<string, FileEntry[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded({});
    setLoading({});
  }, [rootPath, showHidden]);

  const toggleExpand = async (e: React.MouseEvent, entry: FileEntry) => {
    e.stopPropagation();
    if (!entry.isDir) return;
    if (expanded[entry.path]) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[entry.path];
        return next;
      });
      return;
    }
    setLoading((prev) => ({ ...prev, [entry.path]: true }));
    try {
      const children = await readDirOnce(entry.path, showHidden);
      setExpanded((prev) => ({ ...prev, [entry.path]: children }));
    } catch {
      // ignore permission errors on individual folders
    } finally {
      setLoading((prev) => ({ ...prev, [entry.path]: false }));
    }
  };

  const renderNodes = (nodes: FileEntry[], depth: number): React.ReactNode =>
    nodes.map((entry) => {
      const isExpanded = Boolean(expanded[entry.path]);
      const isLoading = Boolean(loading[entry.path]);
      const selected = selectedPaths.includes(entry.path);
      return (
        <React.Fragment key={entry.path}>
          <div
            draggable
            onDragStart={(e) => onDragStart(e, entry)}
            onDragOver={(e) => {
              if (entry.isDir) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onDrop={(e) => entry.isDir && onDropOnDir(e, entry.path)}
            onClick={(e) => onSelect(e, entry)}
            onDoubleClick={() => onOpen(entry)}
            onContextMenu={(e) => onContextMenu(e, entry)}
            style={{ paddingLeft: `${depth * 18 + 8}px` }}
            className={`flex items-center justify-between pr-3 py-1 rounded-lg border text-sm cursor-pointer transition ${
              selected
                ? "bg-accent/15 border-selected text-main font-medium"
                : "border-transparent hover:bg-surface/80 text-main/90"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {entry.isDir ? (
                <button
                  onClick={(e) => toggleExpand(e, entry)}
                  className="p-0.5 rounded hover:bg-base/60 text-muted hover:text-main shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <EntryIcon entry={entry} size="sm" />
              <span className={`truncate ${entry.isHidden ? "opacity-60" : ""}`}>
                {entry.name}
              </span>
              {entry.isSymlink && <Link2 className="w-3 h-3 text-warning shrink-0" />}
              {isLoading && <span className="text-[10px] text-muted ml-1">…</span>}
            </div>
            <div className="flex items-center gap-5 shrink-0 text-xs text-muted font-mono">
              <span className="w-16 text-right">{formatBytes(entry.size)}</span>
              <span className="w-32 text-right font-sans hidden md:inline">
                {formatDate(entry.modifiedMs)}
              </span>
              <span className="w-10 text-right hidden lg:inline">
                {formatMode(entry.permissionsOctal)}
              </span>
            </div>
          </div>
          {isExpanded && expanded[entry.path] && renderNodes(expanded[entry.path], depth + 1)}
        </React.Fragment>
      );
    });

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {renderNodes(entries, 0)}
    </div>
  );
};
