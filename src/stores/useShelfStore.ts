import { create } from "zustand";
import { baseName } from "../lib/format";

export interface ShelfItem {
  path: string;
  name: string;
  isDir: boolean;
}

const STORAGE_KEY = "easyfile.shelf";

function loadShelf(): ShelfItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveShelf(items: ShelfItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

interface ShelfStore {
  items: ShelfItem[];
  addPaths: (entries: { path: string; isDir?: boolean }[]) => number;
  removePath: (path: string) => void;
  clear: () => void;
}

export const useShelfStore = create<ShelfStore>((set, get) => ({
  items: loadShelf(),

  addPaths: (entries) => {
    const current = get().items;
    const existing = new Set(current.map((i) => i.path));
    const added: ShelfItem[] = [];
    for (const e of entries) {
      if (!existing.has(e.path)) {
        existing.add(e.path);
        added.push({ path: e.path, name: baseName(e.path), isDir: Boolean(e.isDir) });
      }
    }
    if (added.length === 0) return 0;
    const next = [...current, ...added];
    saveShelf(next);
    set({ items: next });
    return added.length;
  },

  removePath: (path) => {
    const next = get().items.filter((i) => i.path !== path);
    saveShelf(next);
    set({ items: next });
  },

  clear: () => {
    saveShelf([]);
    set({ items: [] });
  },
}));
