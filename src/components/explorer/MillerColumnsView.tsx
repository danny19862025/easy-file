import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { FileEntry } from "../../types/fs";
import { readDirOnce } from "../../lib/readDirOnce";
import { formatBytes, formatDate, formatMode, localFileUrl } from "../../lib/format";
import { EntryIcon } from "./EntryIcon";

interface MillerColumn {
  path: string;
  entries: FileEntry[];
  selectedPath: string | null;
  loading?: boolean;
}

interface MillerColumnsViewProps {
  rootPath: string;
  rootEntries: FileEntry[];
  showHidden: boolean;
  onSelect: (e: React.MouseEvent, entry: FileEntry) => void;
  onOpen: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onDragStart: (e: React.DragEvent, entry: FileEntry) => void;
}

export const MillerColumnsView: React.FC<MillerColumnsViewProps> = ({
  rootPath,
  rootEntries,
  showHidden,
  onSelect,
  onOpen,
  onContextMenu,
  onDragStart,
}) => {
  const [extraCols, setExtraCols] = useState<MillerColumn[]>([]);
  const [rootSelected, setRootSelected] = useState<string | null>(null);
  const [leafEntry, setLeafEntry] = useState<FileEntry | null>(null);

  useEffect(() => {
    setExtraCols([]);
    setRootSelected(null);
    setLeafEntry(null);
  }, [rootPath, showHidden]);

  const handleClick = async (colIndex: number, e: React.MouseEvent, entry: FileEntry) => {
    onSelect(e, entry);

    if (colIndex === 0) {
      setRootSelected(entry.path);
    } else {
      setExtraCols((prev) =>
        prev.slice(0, colIndex).map((c, idx) =>
          idx === colIndex - 1 ? { ...c, selectedPath: entry.path } : c
        )
      );
    }

    if (entry.isDir) {
      setLeafEntry(null);
      const loadingCol: MillerColumn = {
        path: entry.path,
        entries: [],
        selectedPath: null,
        loading: true,
      };
      setExtraCols((prev) => [...prev.slice(0, colIndex), loadingCol]);
      try {
        const children = await readDirOnce(entry.path, showHidden);
        setExtraCols((prev) => {
          const next = [...prev.slice(0, colIndex), { path: entry.path, entries: children, selectedPath: null }];
          return next;
        });
      } catch {
        setExtraCols((prev) => prev.slice(0, colIndex));
      }
    } else {
      setExtraCols((prev) => prev.slice(0, colIndex));
      setLeafEntry(entry);
    }
  };

  const columns: MillerColumn[] = [
    { path: rootPath, entries: rootEntries, selectedPath: rootSelected },
    ...extraCols,
  ];

  return (
    <div className="flex-1 overflow-x-auto flex divide-x divide-subtle min-h-0">
      {columns.map((col, colIdx) => (
        <div key={`${col.path}-${colIdx}`} className="w-60 shrink-0 overflow-y-auto p-1.5 space-y-0.5">
          {col.loading ? (
            <div className="p-3 text-xs text-muted">Loading…</div>
          ) : col.entries.length === 0 ? (
            <div className="p-3 text-xs text-muted italic">Empty folder</div>
          ) : (
            col.entries.map((entry) => {
              const selected = col.selectedPath === entry.path;
              return (
                <button
                  key={entry.path}
                  draggable
                  onDragStart={(e) => onDragStart(e, entry)}
                  onClick={(e) => handleClick(colIdx, e, entry)}
                  onDoubleClick={() => onOpen(entry)}
                  onContextMenu={(e) => onContextMenu(e, entry)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs text-left transition ${
                    selected
                      ? "bg-accent/15 border-selected text-main font-medium"
                      : "border-transparent hover:bg-surface/80 text-main/90"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <EntryIcon entry={entry} size="sm" />
                    <span className={`truncate ${entry.isHidden ? "opacity-60" : ""}`}>
                      {entry.name}
                    </span>
                  </div>
                  {entry.isDir && <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      ))}

      {/* Inline Leaf Preview Column */}
      {leafEntry && (
        <div className="w-64 shrink-0 overflow-y-auto p-4 bg-mantle/40 flex flex-col gap-3">
          <div className="h-36 rounded-xl border border-subtle bg-crust flex items-center justify-center overflow-hidden">
            {leafEntry.mimeType?.startsWith("image/") ? (
              <img
                src={localFileUrl(leafEntry.path)}
                alt={leafEntry.name}
                className="max-h-36 w-full object-contain"
              />
            ) : (
              <EntryIcon entry={leafEntry} size="md" />
            )}
          </div>
          <p className="text-xs font-semibold text-main break-all">{leafEntry.name}</p>
          <dl className="text-[11px] text-muted space-y-1">
            <div className="flex justify-between">
              <dt>Size</dt>
              <dd className="text-main">{formatBytes(leafEntry.size)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Modified</dt>
              <dd className="text-main">{formatDate(leafEntry.modifiedMs)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Mode</dt>
              <dd className="text-main font-mono">{formatMode(leafEntry.permissionsOctal)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};
