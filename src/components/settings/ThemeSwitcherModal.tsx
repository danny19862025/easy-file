import React from "react";
import { Check, Moon, Palette, Sparkles, Sun, X } from "lucide-react";
import { ICON_PACKS, useTheme } from "../../context/ThemeContext";

interface ThemeSwitcherModalProps {
  onClose: () => void;
}

export const ThemeSwitcherModal: React.FC<ThemeSwitcherModalProps> = ({ onClose }) => {
  const { themeId, setTheme, themes, iconPack, setIconPack } = useTheme();

  return (
    <div
      className="fixed inset-0 z-50 bg-crust/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-main">Appearance, Themes &amp; Icons</h2>
              <p className="text-xs text-muted">
                Instant runtime switching persisted across restarts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-main transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Icon Pack Selector */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span>Icon Pack</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ICON_PACKS.map((pack) => {
                const active = pack.id === iconPack;
                return (
                  <button
                    key={pack.id}
                    onClick={() => setIconPack(pack.id)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      active
                        ? "bg-accent/15 border-selected"
                        : "bg-base/70 border-subtle/70 hover:bg-surface/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-main">{pack.name}</span>
                      {active && <Check className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5 leading-snug">{pack.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Presets */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Color Themes
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {themes.map((item) => {
                const active = item.id === themeId;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item.id)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition text-left ${
                      active
                        ? "bg-accent/15 border-selected shadow-sm"
                        : "bg-base/70 border-subtle/70 hover:bg-surface/80 hover:border-selected/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        {item.swatches.map((hex, i) => (
                          <span
                            key={i}
                            className="w-4 h-4 rounded-full border border-black/25 shadow-sm"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-main">{item.name}</span>
                          {item.mode === "light" ? (
                            <Sun className="w-3 h-3 text-warning" />
                          ) : (
                            <Moon className="w-3 h-3 text-secondary" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted truncate">{item.description}</p>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition ${
                        active ? "bg-accent text-crust" : "border border-subtle"
                      }`}
                    >
                      {active && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
