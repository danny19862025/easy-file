import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, FilePlus, FolderPlus, Pencil, X } from "lucide-react";

export type PromptDialogConfig =
  | {
      kind: "input";
      icon: "folder" | "file" | "rename";
      title: string;
      placeholder: string;
      initialValue?: string;
      confirmLabel: string;
      onSubmit: (value: string) => void;
    }
  | {
      kind: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      danger?: boolean;
      onConfirm: () => void;
    };

interface PromptModalProps {
  config: PromptDialogConfig;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ config, onClose }) => {
  const [value, setValue] = useState(
    config.kind === "input" ? config.initialValue ?? "" : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config.kind === "input" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config.kind, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.kind === "input") {
      const trimmed = value.trim();
      if (!trimmed) return;
      config.onSubmit(trimmed);
      onClose();
    } else {
      config.onConfirm();
      onClose();
    }
  };

  const renderIcon = () => {
    if (config.kind === "confirm") {
      return <AlertTriangle className="w-4 h-4 text-danger" />;
    }
    if (config.icon === "folder") return <FolderPlus className="w-4 h-4 text-folder" />;
    if (config.icon === "file") return <FilePlus className="w-4 h-4 text-accent" />;
    return <Pencil className="w-4 h-4 text-secondary" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-crust/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-main">
            {renderIcon()}
            <span>{config.title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface text-muted hover:text-main transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {config.kind === "input" ? (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.placeholder}
              className="w-full px-3 py-2 rounded-xl bg-base border border-subtle focus:border-selected text-sm text-main placeholder:text-muted outline-none font-mono"
            />
          ) : (
            <p className="text-sm text-muted leading-relaxed">{config.message}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-subtle bg-surface/60 hover:bg-surface text-xs font-medium text-main transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={config.kind === "input" && !value.trim()}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 ${
                config.kind === "confirm" && config.danger
                  ? "bg-danger text-crust hover:opacity-90"
                  : "bg-accent text-crust hover:opacity-90"
              }`}
            >
              {config.confirmLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
