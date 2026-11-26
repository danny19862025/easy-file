import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FileEntry, MountPoint, UserDirsInfo } from "../../types/fs";
import { NetworkBookmark, RcloneRemote, SyncRule } from "../../types/network";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useShelfStore } from "../../stores/useShelfStore";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ExplorerPane } from "../explorer/ExplorerPane";
import { ContextMenu, ContextMenuState } from "../explorer/ContextMenu";
import { DropZoneShelf } from "../explorer/DropZoneShelf";
import { QuickLookModal } from "../preview/QuickLookModal";
import { TerminalDrawer } from "../terminal/TerminalDrawer";
import { DiskUsageOverlay } from "../disk/DiskUsageOverlay";
import { ThemeSwitcherModal } from "../settings/ThemeSwitcherModal";
import { ShortcutsModal } from "../settings/ShortcutsModal";
import { PromptDialogConfig, PromptModal } from "../modals/PromptModal";
import { FuzzySearchModal } from "../search/FuzzySearchModal";
import { MountRemoteModal } from "../network/MountRemoteModal";
import { CloudSyncModal } from "../network/CloudSyncModal";
import { baseName, parentPath } from "../../lib/format";

export const ExplorerLayout: React.FC = () => {
  const store = useWorkspaceStore();
  const shelf = useShelfStore();
  const [userDirs, setUserDirs] = useState<UserDirsInfo | null>(null);
  const [mounts, setMounts] = useState<MountPoint[]>([]);
  const [activeEntry, setActiveEntry] = useState<FileEntry | null>(null);
  const [activeEntries, setActiveEntries] = useState<FileEntry[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [networkBookmarks, setNetworkBookmarks] = useState<NetworkBookmark[]>([]);
  const [cloudRemotes, setCloudRemotes] = useState<RcloneRemote[]>([]);
  const [syncRules, setSyncRules] = useState<SyncRule[]>([]);
  const [promptDialog, setPromptDialog] = useState<PromptDialogConfig | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [focusPathSignal, setFocusPathSignal] = useState(0);
  const [reloadSignal, setReloadSignal] = useState(0);
  const panesContainerRef = useRef<HTMLDivElement>(null);

  const activePane = store.panes.find((p) => p.id === store.activePaneId) ?? store.panes[0];
  const activeTab =
    activePane.tabs.find((t) => t.id === activePane.activeTabId) ?? activePane.tabs[0];

  const refreshNetworkAndCloud = useCallback(() => {
    invoke<MountPoint[]>("list_mounts").then(setMounts).catch(() => {});
    invoke<NetworkBookmark[]>("list_network_bookmarks").then(setNetworkBookmarks).catch(() => {});
    invoke<RcloneRemote[]>("list_cloud_remotes").then(setCloudRemotes).catch(() => {});
    invoke<SyncRule[]>("list_sync_rules").then(setSyncRules).catch(() => {});
  }, []);

  useEffect(() => {
    invoke<UserDirsInfo>("get_user_dirs")
      .then((dirs) => {
        setUserDirs(dirs);
        store.initHome(dirs.home);
      })
      .catch(() => {});

    refreshNetworkAndCloud();

    const unlisten = listen<SyncRule[]>("cloud:sync-updated", (event) => {
      setSyncRules(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refreshNetworkAndCloud]);

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = panesContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      store.setSplitRatio(pct);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleCreateFolder = useCallback(() => {
    setPromptDialog({
      kind: "input",
      icon: "folder",
      title: "New Folder",
      placeholder: "Enter folder name…",
      confirmLabel: "Create Folder",
      onSubmit: async (name) => {
        try {
          await invoke("create_dir", { parent: activeTab.path, name });
          setReloadSignal((n) => n + 1);
          store.showToast(`Created folder "${name}"`);
        } catch (err) {
          store.showToast(String(err));
        }
      },
    });
  }, [activeTab.path, store]);

  const handleCreateFile = useCallback(() => {
    setPromptDialog({
      kind: "input",
      icon: "file",
      title: "New File",
      placeholder: "Enter file name (e.g. notes.md)…",
      confirmLabel: "Create File",
      onSubmit: async (name) => {
        try {
          await invoke("create_file", { parent: activeTab.path, name });
          setReloadSignal((n) => n + 1);
          store.showToast(`Created file "${name}"`);
        } catch (err) {
          store.showToast(String(err));
        }
      },
    });
  }, [activeTab.path, store]);

  const handleRename = useCallback(() => {
    if (activePane.selectedPaths.length !== 1) return;
    const target = activePane.selectedPaths[0];
    setPromptDialog({
      kind: "input",
      icon: "rename",
      title: "Rename Item",
      placeholder: "New name…",
      initialValue: baseName(target),
      confirmLabel: "Rename",
      onSubmit: async (newName) => {
        try {
          await invoke("rename_entry", { path: target, newName });
          setReloadSignal((n) => n + 1);
          store.showToast(`Renamed to "${newName}"`);
        } catch (err) {
          store.showToast(String(err));
        }
      },
    });
  }, [activePane.selectedPaths, store]);

  const handleTrash = useCallback(async () => {
    if (activePane.selectedPaths.length === 0) return;
    try {
      await invoke("move_to_trash", { paths: activePane.selectedPaths });
      store.setSelection(activePane.id, []);
      setReloadSignal((n) => n + 1);
      store.showToast(`Moved ${activePane.selectedPaths.length} item(s) to Trash`);
    } catch (err) {
      store.showToast(String(err));
    }
  }, [activePane.id, activePane.selectedPaths, store]);

  const handleDeletePermanent = useCallback(() => {
    if (activePane.selectedPaths.length === 0) return;
    const pathsToDelete = [...activePane.selectedPaths];
    setPromptDialog({
      kind: "confirm",
      title: "Delete Permanently",
      message: `Permanently delete ${pathsToDelete.length} item(s)? This cannot be undone.`,
      confirmLabel: "Delete Permanently",
      danger: true,
      onConfirm: async () => {
        try {
          await invoke("delete_permanent", { paths: pathsToDelete });
          store.setSelection(activePane.id, []);
          setReloadSignal((n) => n + 1);
          store.showToast(`Permanently deleted ${pathsToDelete.length} item(s)`);
        } catch (err) {
          store.showToast(String(err));
        }
      },
    });
  }, [activePane.id, activePane.selectedPaths, store]);

  const handlePaste = useCallback(
    async (overrideDest?: string) => {
      const clip = store.clipboard;
      if (!clip || clip.paths.length === 0) return;
      const destDir = overrideDest ?? activeTab.path;
      try {
        if (clip.mode === "copy") {
          await invoke("copy_entries", { sources: clip.paths, destDir });
          store.showToast(`Copied ${clip.paths.length} item(s)`);
        } else {
          await invoke("move_entries", { sources: clip.paths, destDir });
          store.setClipboard(null);
          store.showToast(`Moved ${clip.paths.length} item(s)`);
        }
      } catch (err) {
        store.showToast(String(err));
      }
    },
    [store, activeTab.path]
  );

  const handleCopyPath = useCallback(
    (path: string) => {
      navigator.clipboard?.writeText(path).catch(() => {});
      store.showToast("Copied path to clipboard");
    },
    [store]
  );

  const handleDropEntries = useCallback(
    async (sources: string[], destDir: string) => {
      try {
        await invoke("move_entries", { sources, destDir });
        store.showToast(`Moved ${sources.length} item(s)`);
      } catch (err) {
        store.showToast(String(err));
      }
    },
    [store]
  );

  const handleCopyEntries = useCallback(
    async (sources: string[], destDir: string) => {
      try {
        await invoke("copy_entries", { sources, destDir });
        store.showToast(`Copied ${sources.length} item(s)`);
      } catch (err) {
        store.showToast(String(err));
      }
    },
    [store]
  );

  // Comprehensive Linux File Manager Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.closest(".xterm") !== null);
      if (inInput) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "Escape") {
        if (promptDialog) return setPromptDialog(null);
        if (showSearchModal) return setShowSearchModal(false);
        if (store.showQuickLook) return store.setShowQuickLook(false);
        if (showThemeModal) return setShowThemeModal(false);
        if (showShortcutsModal) return setShowShortcutsModal(false);
        if (store.showDiskUsage) return store.toggleDiskUsage();
        if (activePane.selectedPaths.length > 0) {
          store.setSelection(activePane.id, []);
        }
        return;
      }

      if ((ctrl && key === "f") || (!ctrl && !e.altKey && e.key === "/")) {
        e.preventDefault();
        setShowSearchModal(true);
        return;
      }

      if ((ctrl && e.key === "/") || (!ctrl && e.key === "?")) {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
        return;
      }

      if (ctrl && key === "c" && activePane.selectedPaths.length > 0) {
        e.preventDefault();
        store.setClipboard({ mode: "copy", paths: activePane.selectedPaths });
        store.showToast(`Copied ${activePane.selectedPaths.length} item(s)`);
      } else if (ctrl && key === "x" && activePane.selectedPaths.length > 0) {
        e.preventDefault();
        store.setClipboard({ mode: "cut", paths: activePane.selectedPaths });
        store.showToast(`Cut ${activePane.selectedPaths.length} item(s)`);
      } else if (ctrl && key === "v") {
        e.preventDefault();
        handlePaste();
      } else if (ctrl && key === "a") {
        e.preventDefault();
        store.setSelection(
          activePane.id,
          activeEntries.map((entry) => entry.path)
        );
      } else if (ctrl && e.shiftKey && key === "n") {
        e.preventDefault();
        handleCreateFolder();
      } else if (ctrl && e.altKey && key === "n") {
        e.preventDefault();
        handleCreateFile();
      } else if (e.key === "F2") {
        e.preventDefault();
        handleRename();
      } else if (e.key === "Delete" && e.shiftKey) {
        e.preventDefault();
        handleDeletePermanent();
      } else if (e.key === "Delete") {
        e.preventDefault();
        handleTrash();
      } else if (e.key === "Enter" && activeEntry) {
        e.preventDefault();
        if (activeEntry.isDir) {
          store.navigate(activePane.id, activeEntry.path);
        } else {
          invoke("open_with_default", { path: activeEntry.path }).catch(() => {});
        }
      } else if (ctrl && key === "l") {
        e.preventDefault();
        setFocusPathSignal((n) => n + 1);
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        store.goBack(activePane.id);
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        store.goForward(activePane.id);
      } else if ((e.altKey && e.key === "ArrowUp") || (!ctrl && !e.altKey && e.key === "Backspace")) {
        e.preventDefault();
        store.navigate(activePane.id, parentPath(activeTab.path));
      } else if (ctrl && key === "t") {
        e.preventDefault();
        store.addTab(activePane.id);
      } else if (ctrl && key === "w") {
        e.preventDefault();
        store.closeTab(activePane.id, activeTab.id);
      } else if (ctrl && e.key === "Tab" && activePane.tabs.length > 1) {
        e.preventDefault();
        const idx = activePane.tabs.findIndex((t) => t.id === activeTab.id);
        const nextIdx = (idx + 1) % activePane.tabs.length;
        store.setActiveTab(activePane.id, activePane.tabs[nextIdx].id);
      } else if (e.key === "F5" || (ctrl && key === "r")) {
        e.preventDefault();
        setReloadSignal((n) => n + 1);
      } else if (ctrl && e.key === "1") {
        e.preventDefault();
        store.setPaneViewMode(activePane.id, "grid");
      } else if (ctrl && e.key === "2") {
        e.preventDefault();
        store.setPaneViewMode(activePane.id, "list");
      } else if (ctrl && e.key === "3") {
        e.preventDefault();
        store.setPaneViewMode(activePane.id, "details");
      } else if (ctrl && e.key === "4") {
        e.preventDefault();
        store.setPaneViewMode(activePane.id, "miller");
      } else if (ctrl && e.key === "5") {
        e.preventDefault();
        store.setPaneViewMode(activePane.id, "tree");
      } else if (e.code === "Space") {
        e.preventDefault();
        if (activeEntry || store.showQuickLook) store.toggleQuickLook();
      } else if (ctrl && key === "b") {
        e.preventDefault();
        store.toggleShelf();
      } else if (ctrl && key === "h") {
        e.preventDefault();
        store.toggleHidden();
      } else if (ctrl && e.key === "\\") {
        e.preventDefault();
        store.toggleSplitView();
      } else if (ctrl && key === "d") {
        e.preventDefault();
        store.toggleDiskUsage();
      } else if (ctrl && e.key === "`") {
        e.preventDefault();
        store.toggleTerminal();
      } else if (ctrl && e.key === ",") {
        e.preventDefault();
        setShowThemeModal((v) => !v);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activePane,
    activeTab,
    activeEntry,
    activeEntries,
    showThemeModal,
    showShortcutsModal,
    store,
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleTrash,
    handleDeletePermanent,
    handlePaste,
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base text-main select-none">
      <Sidebar
        userDirs={userDirs}
        mounts={mounts}
        pinnedPaths={store.pinnedPaths}
        networkBookmarks={networkBookmarks}
        cloudRemotes={cloudRemotes}
        syncRules={syncRules}
        activePath={activeTab.path}
        onNavigate={(path) => store.navigate(activePane.id, path)}
        onUnpin={store.togglePin}
        onOpenConnectNetwork={() => setShowNetworkModal(true)}
        onOpenCloudSync={() => setShowCloudSyncModal(true)}
        onClickNetworkBookmark={async (bm) => {
          if (bm.mountPath) {
            store.navigate(activePane.id, bm.mountPath);
          } else {
            store.showToast(`Mounting ${bm.name}…`);
            setShowNetworkModal(true);
          }
        }}
        onClickCloudRemote={async (remote) => {
          if (remote.mounted && remote.mountPath) {
            store.navigate(activePane.id, remote.mountPath);
          } else {
            try {
              store.showToast(`Mounting ${remote.name}…`);
              const mp = await invoke<string>("mount_cloud_remote", { remoteName: remote.name });
              refreshNetworkAndCloud();
              store.navigate(activePane.id, mp);
            } catch (err) {
              store.showToast(String(err));
            }
          }
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          currentPath={activeTab.path}
          canBack={activeTab.historyIndex > 0}
          canForward={activeTab.historyIndex < activeTab.history.length - 1}
          isPinned={store.pinnedPaths.includes(activeTab.path)}
          viewMode={activePane.viewMode}
          splitView={store.splitView}
          showHidden={store.showHidden}
          showQuickLook={store.showQuickLook}
          showTerminal={store.showTerminal}
          showDiskUsage={store.showDiskUsage}
          showShelf={store.showShelf}
          shelfCount={shelf.items.length}
          onBack={() => store.goBack(activePane.id)}
          onForward={() => store.goForward(activePane.id)}
          onNavigate={(path) => store.navigate(activePane.id, path)}
          onTogglePin={() => store.togglePin(activeTab.path)}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onViewMode={(mode) => store.setPaneViewMode(activePane.id, mode)}
          onToggleSplit={store.toggleSplitView}
          onToggleHidden={store.toggleHidden}
          onToggleQuickLook={store.toggleQuickLook}
          onToggleTerminal={store.toggleTerminal}
          onToggleDiskUsage={store.toggleDiskUsage}
          onToggleShelf={store.toggleShelf}
          onOpenThemeModal={() => setShowThemeModal(true)}
          onOpenShortcutsModal={() => setShowShortcutsModal(true)}
          onOpenSearchModal={() => setShowSearchModal(true)}
          focusPathSignal={focusPathSignal}
        />

        {/* Draggable Split Panes */}
        <div ref={panesContainerRef} className="flex-1 flex min-h-0">
          {store.panes.map((pane, idx) => {
            const widthStyle: React.CSSProperties | undefined = store.splitView
              ? {
                  width: idx === 0 ? `${store.splitRatio}%` : `${100 - store.splitRatio}%`,
                  flexShrink: 0,
                }
              : { flex: 1 };

            return (
              <React.Fragment key={pane.id}>
                <ExplorerPane
                  pane={pane}
                  isActive={pane.id === store.activePaneId}
                  showHidden={store.showHidden}
                  style={widthStyle}
                  onActivate={() => store.setActivePane(pane.id)}
                  onNavigate={(path) => store.navigate(pane.id, path)}
                  onAddTab={() => store.addTab(pane.id)}
                  onCloseTab={(tabId) => store.closeTab(pane.id, tabId)}
                  onSelectTab={(tabId) => store.setActiveTab(pane.id, tabId)}
                  onSelectPaths={(paths) => store.setSelection(pane.id, paths)}
                  onActiveEntryChange={setActiveEntry}
                  onActiveEntriesChange={setActiveEntries}
                  onDropEntries={handleDropEntries}
                  onContextMenu={(e, entry, dirPath) =>
                    setContextMenu({ x: e.clientX, y: e.clientY, paneId: pane.id, dirPath, entry })
                  }
                  reloadSignal={reloadSignal}
                />
                {store.splitView && idx === 0 && (
                  <div
                    onMouseDown={handleStartResize}
                    onDoubleClick={() => store.setSplitRatio(50)}
                    className="w-1.5 shrink-0 bg-subtle/60 hover:bg-selected cursor-col-resize transition"
                    title="Drag to resize split panes (double-click to reset)"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {store.showTerminal && (
          <TerminalDrawer cwd={activeTab.path} onClose={store.toggleTerminal} />
        )}
      </div>

      {/* Persistent Drop Zone Shelf */}
      {store.showShelf && (
        <DropZoneShelf
          currentPath={activeTab.path}
          onMoveAllHere={(paths) => handleDropEntries(paths, activeTab.path)}
          onCopyAllHere={(paths) => handleCopyEntries(paths, activeTab.path)}
          onClose={() => store.setShowShelf(false)}
        />
      )}

      {/* Floating Quick Look Modal (Spacebar) */}
      {store.showQuickLook && (
        <QuickLookModal entry={activeEntry} onClose={() => store.setShowQuickLook(false)} />
      )}

      {store.showDiskUsage && (
        <DiskUsageOverlay
          path={activeTab.path}
          onNavigate={(path) => store.navigate(activePane.id, path)}
          onClose={store.toggleDiskUsage}
        />
      )}

      {showThemeModal && <ThemeSwitcherModal onClose={() => setShowThemeModal(false)} />}
      {showShortcutsModal && <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />}
      {showNetworkModal && (
        <MountRemoteModal
          onClose={() => setShowNetworkModal(false)}
          onConnected={(bm) => {
            refreshNetworkAndCloud();
            if (bm.mountPath) {
              store.navigate(activePane.id, bm.mountPath);
              store.showToast(`Connected to ${bm.name}`);
            } else {
              store.showToast(`Saved ${bm.name}`);
            }
          }}
        />
      )}
      {showCloudSyncModal && (
        <CloudSyncModal
          currentPath={activeTab.path}
          remotes={cloudRemotes}
          rules={syncRules}
          onRefresh={refreshNetworkAndCloud}
          onNavigate={(path) => store.navigate(activePane.id, path)}
          onToast={store.showToast}
          onClose={() => setShowCloudSyncModal(false)}
        />
      )}
      {promptDialog && (
        <PromptModal config={promptDialog} onClose={() => setPromptDialog(null)} />
      )}
      {showSearchModal && (
        <FuzzySearchModal
          rootPath={activeTab.path}
          onClose={() => setShowSearchModal(false)}
          onSelectHit={(hit) => {
            if (hit.isDir) {
              store.navigate(activePane.id, hit.path);
            } else {
              store.navigate(activePane.id, hit.parentDir);
              setTimeout(() => store.setSelection(activePane.id, [hit.path]), 80);
            }
          }}
        />
      )}

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          hasClipboard={Boolean(store.clipboard && store.clipboard.paths.length > 0)}
          isPinned={store.pinnedPaths.includes(contextMenu.entry?.path ?? contextMenu.dirPath)}
          onClose={() => setContextMenu(null)}
          onOpen={(entry) => {
            if (entry.isDir) {
              store.navigate(contextMenu.paneId, entry.path);
            } else {
              invoke("open_with_default", { path: entry.path }).catch(() => {});
            }
          }}
          onOpenInNewTab={(path) => store.addTab(contextMenu.paneId, path)}
          onPreview={() => store.setShowQuickLook(true)}
          onCut={() => {
            const paths =
              activePane.selectedPaths.length > 0
                ? activePane.selectedPaths
                : contextMenu.entry
                ? [contextMenu.entry.path]
                : [];
            if (paths.length > 0) {
              store.setClipboard({ mode: "cut", paths });
              store.showToast(`Cut ${paths.length} item(s)`);
            }
          }}
          onCopy={() => {
            const paths =
              activePane.selectedPaths.length > 0
                ? activePane.selectedPaths
                : contextMenu.entry
                ? [contextMenu.entry.path]
                : [];
            if (paths.length > 0) {
              store.setClipboard({ mode: "copy", paths });
              store.showToast(`Copied ${paths.length} item(s)`);
            }
          }}
          onPaste={(destDir) => handlePaste(destDir)}
          onCopyPath={handleCopyPath}
          onParkInShelf={() => {
            const toPark =
              activePane.selectedPaths.length > 0
                ? activePane.selectedPaths.map((p) => ({
                    path: p,
                    isDir: activeEntries.find((e) => e.path === p)?.isDir ?? false,
                  }))
                : contextMenu.entry
                ? [{ path: contextMenu.entry.path, isDir: contextMenu.entry.isDir }]
                : [];
            const added = shelf.addPaths(toPark);
            store.setShowShelf(true);
            store.showToast(`Parked ${added} item(s) in Drop Shelf`);
          }}
          onRename={handleRename}
          onTogglePin={store.togglePin}
          onTrash={handleTrash}
          onDeletePermanent={handleDeletePermanent}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onRefresh={() => setReloadSignal((n) => n + 1)}
          onOpenTerminal={() => {
            if (!store.showTerminal) store.toggleTerminal();
          }}
          onDiskUsage={() => {
            if (!store.showDiskUsage) store.toggleDiskUsage();
          }}
        />
      )}

      {store.toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-lg border border-selected/60 bg-mantle/95 backdrop-blur-md text-xs text-main shadow-xl">
          {store.toast}
        </div>
      )}
    </div>
  );
};
