import React, { useState } from "react";
import { Copy, FolderInput, Layers, Trash2, X } from "lucide-react";
import { useShelfStore } from "../../stores/useShelfStore";
import { EntryIcon } from "./EntryIcon";
import { baseName } from "../../lib/format";

interface DropZoneShelfProps {
  currentPath: string;
  onMoveAllHere: (paths: string[]) => void;
  onCopyAllHere: (paths: string[]) => void;
  onClose: () => void;
}

export const DropZoneShelf: React.FC<DropZoneShelfProps> = ({
  currentPath,
  onMoveAllHere,
  onCopyAllHere,
  onClose,
}) => {
  const { items, addPaths, removePath, clear } = useShelfStore();
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const raw = e.dataTransfer.getData("application/x-easyfile-paths");
    if (!raw) return;
    try {
      const paths: string[] = JSON.parse(raw);
      addPaths(paths.map((p) => ({ path: p })));
    } catch {
      // ignore
    }
  };

  return (
    <aside
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`fixed bottom-10 right-5 z-40 w-80 rounded-2xl border backdrop-blur-xl shadow-2xl transition overflow-hidden ${
        dragOver
          ? "border-selected bg-accent/20 ring-2 ring-selected/50"
          : "border-subtle bg-mantle/95"
      }`}
    >
      <div className="px-3.5 py-2.5 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-main">
          <Layers className="w-3.5 h-3.5 text-accent" />
          <span>Drop Shelf</span>
          <span className="px-1.5 py-0.5 rounded-full bg-surface text-[10px] text-muted">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              onClick={clear}
              className="p-1 rounded hover:bg-surface text-muted hover:text-danger transition"
              title="Clear Shelf"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface text-muted hover:text-main transition"
            title="Hide Shelf"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted border-2 border-dashed border-subtle/60 m-3 rounded-xl">
          Drag files from any folder here to park them while you navigate.
        </div>
      ) : (
        <>
          <div className="max-h-48 overflow-y-auto p-2 space-y-1">
            {items.map((item) => (
              <div
                key={item.path}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-easyfile-paths", JSON.stringify([item.path]));
                }}
                className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-base/70 border border-subtle/50 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <EntryIcon entry={{ isDir: item.isDir }} size="sm" />
                  <span className="truncate text-main" title={item.path}>
                    {item.name}
                  </span>
                </div>
                <button
                  onClick={() => removePath(item.path)}
                  className="opacity-60 group-hover:opacity-100 p-0.5 text-muted hover:text-danger"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-2.5 border-t border-subtle bg-base/50 flex items-center gap-2">
            <button
              onClick={() => {
                onMoveAllHere(items.map((i) => i.path));
                clear();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent text-crust text-xs font-semibold hover:opacity-90 transition"
              title={`Move all into ${currentPath}`}
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Move to {baseName(currentPath)}</span>
            </button>
            <button
              onClick={() => onCopyAllHere(items.map((i) => i.path))}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-subtle bg-surface text-main text-xs font-medium hover:border-selected transition"
              title={`Copy all into ${currentPath}`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
