import React from "react";
import { Check, Moon, Palette, Sun, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface ThemeSwitcherModalProps {
  onClose: () => void;
}

export const ThemeSwitcherModal: React.FC<ThemeSwitcherModalProps> = ({ onClose }) => {
  const { themeId, setTheme, themes } = useTheme();

  return (
    <div
      className="fixed inset-0 z-50 bg-crust/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-main">Appearance &amp; Theme</h2>
              <p className="text-xs text-muted">
                Switches instantly and saves automatically across restarts
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

        <div className="p-4 space-y-2.5">
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
                        className="w-5 h-5 rounded-full border border-black/20 shadow-sm"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-main">{item.name}</span>
                      {item.mode === "light" ? (
                        <Sun className="w-3.5 h-3.5 text-warning" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-secondary" />
                      )}
                    </div>
                    <p className="text-xs text-muted truncate">{item.description}</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${
                    active ? "bg-accent text-crust" : "border border-subtle"
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
