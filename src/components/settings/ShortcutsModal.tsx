import React from "react";
import { Keyboard, X } from "lucide-react";

interface ShortcutsModalProps {
  onClose: () => void;
}

const GROUPS = [
  {
    title: "File Operations",
    items: [
      { keys: ["Ctrl", "C"], label: "Copy selected items" },
      { keys: ["Ctrl", "X"], label: "Cut selected items" },
      { keys: ["Ctrl", "V"], label: "Paste into current folder" },
      { keys: ["Ctrl", "A"], label: "Select all items" },
      { keys: ["Enter"], label: "Open selected folder or file" },
      { keys: ["F2"], label: "Rename selected item" },
      { keys: ["Ctrl", "Shift", "N"], label: "Create new folder" },
      { keys: ["Ctrl", "Alt", "N"], label: "Create new file" },
      { keys: ["Delete"], label: "Move selected to Trash" },
      { keys: ["Shift", "Delete"], label: "Delete permanently" },
      { keys: ["Esc"], label: "Clear selection / close modal" },
    ],
  },
  {
    title: "Navigation & Tabs",
    items: [
      { keys: ["Ctrl", "L"], label: "Edit path bar" },
      { keys: ["Alt", "← / →"], label: "History back / forward" },
      { keys: ["Alt", "↑"], label: "Go to parent folder" },
      { keys: ["Backspace"], label: "Go to parent folder" },
      { keys: ["Ctrl", "T"], label: "Open new tab" },
      { keys: ["Ctrl", "W"], label: "Close active tab" },
      { keys: ["Ctrl", "Tab"], label: "Cycle tabs" },
      { keys: ["F5"], label: "Refresh directory" },
    ],
  },
  {
    title: "Views & Tools",
    items: [
      { keys: ["Ctrl", "1 / 2 / 3"], label: "Grid / List / Column view" },
      { keys: ["Space"], label: "Toggle Quick Preview" },
      { keys: ["Ctrl", "\\"], label: "Toggle Dual-Pane Split View" },
      { keys: ["Ctrl", "H"], label: "Toggle hidden files" },
      { keys: ["Ctrl", "D"], label: "Disk usage breakdown" },
      { keys: ["Ctrl", "`"], label: "Toggle integrated terminal" },
      { keys: ["Ctrl", ","], label: "Open Theme Switcher" },
      { keys: ["Ctrl", "/"], label: "Show keyboard shortcuts" },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-crust/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[82vh] rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-main">Keyboard Shortcuts</h2>
              <p className="text-xs text-muted">Standard Linux file manager bindings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-main transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 py-1 px-2 rounded-lg bg-base/60 border border-subtle/50 text-xs"
                  >
                    <span className="text-main">{item.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-1.5 py-0.5 rounded bg-surface border border-subtle text-[10px] font-mono text-main"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
