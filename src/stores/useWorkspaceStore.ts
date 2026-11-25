import { create } from "zustand";
import { ViewMode } from "../types/fs";

export interface TabState {
  id: string;
  path: string;
  history: string[];
  historyIndex: number;
}

export interface PaneState {
  id: string;
  tabs: TabState[];
  activeTabId: string;
  selectedPaths: string[];
  viewMode: ViewMode;
}

interface ClipboardState {
  mode: "copy" | "cut";
  paths: string[];
}

interface WorkspaceStore {
  panes: PaneState[];
  activePaneId: string;
  splitView: boolean;
  splitRatio: number;
  showHidden: boolean;
  showQuickLook: boolean;
  showTerminal: boolean;
  showDiskUsage: boolean;
  showShelf: boolean;
  pinnedPaths: string[];
  clipboard: ClipboardState | null;
  toast: string | null;

  initHome: (homePath: string) => void;
  setActivePane: (paneId: string) => void;
  toggleSplitView: () => void;
  setSplitRatio: (ratio: number) => void;
  setPaneViewMode: (paneId: string, mode: ViewMode) => void;
  toggleHidden: () => void;
  toggleQuickLook: () => void;
  setShowQuickLook: (open: boolean) => void;
  toggleTerminal: () => void;
  toggleDiskUsage: () => void;
  toggleShelf: () => void;
  setShowShelf: (open: boolean) => void;

  navigate: (paneId: string, path: string) => void;
  goBack: (paneId: string) => void;
  goForward: (paneId: string) => void;
  addTab: (paneId: string, path?: string) => void;
  closeTab: (paneId: string, tabId: string) => void;
  setActiveTab: (paneId: string, tabId: string) => void;
  setSelection: (paneId: string, paths: string[]) => void;

  togglePin: (path: string) => void;
  setClipboard: (clip: ClipboardState | null) => void;
  showToast: (msg: string) => void;
}

let idCounter = 1;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

function makeTab(path: string): TabState {
  return {
    id: nextId("tab"),
    path,
    history: [path],
    historyIndex: 0,
  };
}

function makePane(id: string, path: string, viewMode: ViewMode = "grid"): PaneState {
  const tab = makeTab(path);
  return {
    id,
    tabs: [tab],
    activeTabId: tab.id,
    selectedPaths: [],
    viewMode,
  };
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  const primary = makePane("pane-left", "/", "grid");

  return {
    panes: [primary],
    activePaneId: primary.id,
    splitView: false,
    splitRatio: 50,
    showHidden: false,
    showQuickLook: false,
    showTerminal: false,
    showDiskUsage: false,
    showShelf: false,
    pinnedPaths: [],
    clipboard: null,
    toast: null,

    initHome: (homePath) => {
      const first = makePane("pane-left", homePath, "grid");
      set({ panes: [first], activePaneId: first.id });
    },

    setActivePane: (paneId) => set({ activePaneId: paneId }),

    toggleSplitView: () => {
      const { splitView, panes } = get();
      if (!splitView) {
        const left = panes[0];
        const leftTab = left.tabs.find((t) => t.id === left.activeTabId) ?? left.tabs[0];
        const right = makePane("pane-right", leftTab.path, left.viewMode);
        set({ splitView: true, splitRatio: 50, panes: [left, right], activePaneId: right.id });
      } else {
        set({ splitView: false, panes: [panes[0]], activePaneId: panes[0].id });
      }
    },

    setSplitRatio: (ratio) => set({ splitRatio: Math.min(80, Math.max(20, ratio)) }),

    setPaneViewMode: (paneId, mode) =>
      set((state) => ({
        panes: state.panes.map((p) => (p.id === paneId ? { ...p, viewMode: mode } : p)),
      })),

    toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),
    toggleQuickLook: () => set((s) => ({ showQuickLook: !s.showQuickLook })),
    setShowQuickLook: (showQuickLook) => set({ showQuickLook }),
    toggleTerminal: () => set((s) => ({ showTerminal: !s.showTerminal })),
    toggleDiskUsage: () => set((s) => ({ showDiskUsage: !s.showDiskUsage })),
    toggleShelf: () => set((s) => ({ showShelf: !s.showShelf })),
    setShowShelf: (showShelf) => set({ showShelf }),

    navigate: (paneId, nextPath) =>
      set((state) => ({
        panes: state.panes.map((pane) => {
          if (pane.id !== paneId) return pane;
          return {
            ...pane,
            selectedPaths: [],
            tabs: pane.tabs.map((tab) => {
              if (tab.id !== pane.activeTabId) return tab;
              if (tab.path === nextPath) return tab;
              const history = tab.history.slice(0, tab.historyIndex + 1);
              history.push(nextPath);
              return {
                ...tab,
                path: nextPath,
                history,
                historyIndex: history.length - 1,
              };
            }),
          };
        }),
      })),

    goBack: (paneId) =>
      set((state) => ({
        panes: state.panes.map((pane) => {
          if (pane.id !== paneId) return pane;
          return {
            ...pane,
            selectedPaths: [],
            tabs: pane.tabs.map((tab) => {
              if (tab.id !== pane.activeTabId || tab.historyIndex <= 0) return tab;
              const nextIdx = tab.historyIndex - 1;
              return { ...tab, historyIndex: nextIdx, path: tab.history[nextIdx] };
            }),
          };
        }),
      })),

    goForward: (paneId) =>
      set((state) => ({
        panes: state.panes.map((pane) => {
          if (pane.id !== paneId) return pane;
          return {
            ...pane,
            selectedPaths: [],
            tabs: pane.tabs.map((tab) => {
              if (tab.id !== pane.activeTabId || tab.historyIndex >= tab.history.length - 1) {
                return tab;
              }
              const nextIdx = tab.historyIndex + 1;
              return { ...tab, historyIndex: nextIdx, path: tab.history[nextIdx] };
            }),
          };
        }),
      })),

    addTab: (paneId, path) =>
      set((state) => ({
        panes: state.panes.map((pane) => {
          if (pane.id !== paneId) return pane;
          const active = pane.tabs.find((t) => t.id === pane.activeTabId) ?? pane.tabs[0];
          const tab = makeTab(path ?? active.path);
          return {
            ...pane,
            tabs: [...pane.tabs, tab],
            activeTabId: tab.id,
            selectedPaths: [],
          };
        }),
      })),

    closeTab: (paneId, tabId) =>
      set((state) => ({
        panes: state.panes.map((pane) => {
          if (pane.id !== paneId || pane.tabs.length <= 1) return pane;
          const remaining = pane.tabs.filter((t) => t.id !== tabId);
          const activeTabId =
            pane.activeTabId === tabId ? remaining[remaining.length - 1].id : pane.activeTabId;
          return { ...pane, tabs: remaining, activeTabId, selectedPaths: [] };
        }),
      })),

    setActiveTab: (paneId, tabId) =>
      set((state) => ({
        panes: state.panes.map((pane) =>
          pane.id === paneId ? { ...pane, activeTabId: tabId, selectedPaths: [] } : pane
        ),
      })),

    setSelection: (paneId, paths) =>
      set((state) => ({
        panes: state.panes.map((pane) =>
          pane.id === paneId ? { ...pane, selectedPaths: paths } : pane
        ),
      })),

    togglePin: (path) =>
      set((state) => ({
        pinnedPaths: state.pinnedPaths.includes(path)
          ? state.pinnedPaths.filter((p) => p !== path)
          : [...state.pinnedPaths, path],
      })),

    setClipboard: (clipboard) => set({ clipboard }),

    showToast: (msg) => {
      set({ toast: msg });
      setTimeout(() => {
        if (get().toast === msg) set({ toast: null });
      }, 2800);
    },
  };
});
