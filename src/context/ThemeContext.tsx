import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeId =
  | "catppuccin-mocha"
  | "tokyo-night"
  | "nord"
  | "rose-pine"
  | "catppuccin-latte";

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
    id: "tokyo-night",
    name: "Tokyo Night",
    description: "Vibrant deep blue-dark aesthetic",
    mode: "dark",
    swatches: ["#1a1b26", "#24283b", "#7aa2f7", "#bb9af7"],
    terminal: { background: "#101017", foreground: "#c0caf5", cursor: "#7aa2f7" },
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
    id: "rose-pine",
    name: "Rosé Pine",
    description: "Soft warm dark with rose & iris accents",
    mode: "dark",
    swatches: ["#191724", "#26233a", "#c4a7e7", "#ebbcba"],
    terminal: { background: "#14121d", foreground: "#e0def4", cursor: "#c4a7e7" },
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    description: "Clean, high-legibility light theme",
    mode: "light",
    swatches: ["#eff1f5", "#ccd0da", "#1e66f5", "#8839ef"],
    terminal: { background: "#dce0e8", foreground: "#4c4f69", cursor: "#1e66f5" },
  },
];

const STORAGE_KEY = "easyfile.theme";

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeMeta;
  setTheme: (id: ThemeId) => void;
  themes: ThemeMeta[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return "catppuccin-mocha";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<ThemeId>(readStoredTheme);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themeId;
    root.classList.toggle("dark", theme.mode === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      // ignore storage errors
    }
  }, [themeId, theme.mode]);

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme: setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
