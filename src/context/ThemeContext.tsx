import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeId =
  | "catppuccin-mocha"
  | "light"
  | "graphite"
  | "midnight"
  | "noir"
  | "nord"
  | "dracula"
  | "rose-pine"
  | "tokyo-night";

export type IconPackId = "duotone" | "outline" | "minimal";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  mode: "dark" | "light";
  swatches: [string, string, string, string];
  terminal: {
    background: string;
    foreground: string;
    cursor: string;
  };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    description: "Warm soothing dark palette (Default)",
    mode: "dark",
    swatches: ["#1e1e2e", "#313244", "#89b4fa", "#cba6f7"],
    terminal: { background: "#11111b", foreground: "#cdd6f4", cursor: "#89b4fa" },
  },
  {
    id: "light",
    name: "Light",
    description: "Clean, high-legibility daylight palette",
    mode: "light",
    swatches: ["#eff1f5", "#ccd0da", "#1e66f5", "#8839ef"],
    terminal: { background: "#dce0e8", foreground: "#4c4f69", cursor: "#1e66f5" },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Neutral studio gray for distraction-free focus",
    mode: "dark",
    swatches: ["#1f2023", "#2c2e33", "#60a5fa", "#a78bfa"],
    terminal: { background: "#121315", foreground: "#e6e8ec", cursor: "#60a5fa" },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep obsidian slate with electric sky accents",
    mode: "dark",
    swatches: ["#0f172a", "#1e293b", "#38bdf8", "#818cf8"],
    terminal: { background: "#060a14", foreground: "#e2e8f0", cursor: "#38bdf8" },
  },
  {
    id: "noir",
    name: "Noir",
    description: "True OLED monochrome black",
    mode: "dark",
    swatches: ["#09090b", "#18181b", "#e4e4e7", "#71717a"],
    terminal: { background: "#000000", foreground: "#f4f4f5", cursor: "#e4e4e7" },
  },
  {
    id: "nord",
    name: "Nord",
    description: "Arctic, north-bluish crisp palette",
    mode: "dark",
    swatches: ["#2e3440", "#3b4252", "#88c0d0", "#b48ead"],
    terminal: { background: "#21252e", foreground: "#eceff4", cursor: "#88c0d0" },
  },
  {
    id: "dracula",
    name: "Dracula",
    description: "High-contrast gothic purple & cyan",
    mode: "dark",
    swatches: ["#282a36", "#343746", "#bd93f9", "#ff79c6"],
    terminal: { background: "#191a21", foreground: "#f8f8f2", cursor: "#bd93f9" },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    description: "Soft warm dark with rose & iris accents",
    mode: "dark",
    swatches: ["#191724", "#26233a", "#c4a7e7", "#ebbcba"],
    terminal: { background: "#14121d", foreground: "#e0def4", cursor: "#c4a7e7" },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    description: "Vibrant deep blue-dark aesthetic",
    mode: "dark",
    swatches: ["#1a1b26", "#24283b", "#7aa2f7", "#bb9af7"],
    terminal: { background: "#101017", foreground: "#c0caf5", cursor: "#7aa2f7" },
  },
];

export const ICON_PACKS: { id: IconPackId; name: string; desc: string }[] = [
  { id: "duotone", name: "Duotone", desc: "Soft filled folder & vibrant file glyphs" },
  { id: "outline", name: "Outline", desc: "Crisp hairline stroke iconography" },
  { id: "minimal", name: "Minimal", desc: "Monochrome muted icons for high density" },
];

const THEME_KEY = "easyfile.theme";
const ICON_PACK_KEY = "easyfile.iconPack";

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeMeta;
  setTheme: (id: ThemeId) => void;
  themes: ThemeMeta[];
  iconPack: IconPackId;
  setIconPack: (id: IconPackId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_KEY) as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) return saved;
  } catch {
    // ignore
  }
  return "catppuccin-mocha";
}

function readStoredIconPack(): IconPackId {
  try {
    const saved = localStorage.getItem(ICON_PACK_KEY) as IconPackId | null;
    if (saved && ICON_PACKS.some((p) => p.id === saved)) return saved;
  } catch {
    // ignore
  }
  return "duotone";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<ThemeId>(readStoredTheme);
  const [iconPack, setIconPack] = useState<IconPackId>(readStoredIconPack);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themeId;
    root.classList.toggle("dark", theme.mode === "dark");
    try {
      localStorage.setItem(THEME_KEY, themeId);
    } catch {
      // ignore
    }
  }, [themeId, theme.mode]);

  useEffect(() => {
    try {
      localStorage.setItem(ICON_PACK_KEY, iconPack);
    } catch {
      // ignore
    }
  }, [iconPack]);

  return (
    <ThemeContext.Provider
      value={{ themeId, theme, setTheme: setThemeId, themes: THEMES, iconPack, setIconPack }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
