import React, { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileEntry, MountPoint, UserDirsInfo } from "../../types/fs";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ExplorerPane } from "../explorer/ExplorerPane";
import { QuickPreviewPanel } from "../preview/QuickPreviewPanel";
import { TerminalDrawer } from "../terminal/TerminalDrawer";
import { DiskUsageOverlay } from "../disk/DiskUsageOverlay";
import { baseName } from "../../lib/format";

export const ExplorerLayout: React.FC = () => {
  const store = useWorkspaceStore();
  const [userDirs, setUserDirs] = useState<UserDirsInfo | null>(null);
  const [mounts, setMounts] = useState<MountPoint[]>([]);
  const [activeEntry, setActiveEntry] = useState<FileEntry | null>(null);

  const activePane = store.panes.find((p) => p.id === store.activePaneId) ?? store.panes[0];
  const activeTab =
    activePane.tabs.find((t) => t.id === activePane.activeTabId) ?? activePane.tabs[0];

  useEffect(() => {
    invoke<UserDirsInfo>("get_user_dirs")
      .then((dirs) => {
        setUserDirs(dirs);
        store.initHome(dirs.home);
      })
      .catch(() => {});

    invoke<MountPoint[]>("list_mounts")
      .then(setMounts)
      .catch(() => {});
  }, []);

  const handleCreateFolder = useCallback(async () => {
    const name = window.prompt("New folder name:");
    if (!name?.trim()) return;
    try {
      await invoke("create_dir", { parent: activeTab.path, name: name.trim() });
      store.showToast(`Created folder "${name.trim()}"`);
    } catch (err) {
      store.showToast(String(err));
    }
  }, [activeTab.path, store]);

  const handleCreateFile = useCallback(async () => {
    const name = window.prompt("New file name:");
    if (!name?.trim()) return;
    try {
      await invoke("create_file", { parent: activeTab.path, name: name.trim() });
      store.showToast(`Created file "${name.trim()}"`);
    } catch (err) {
      store.showToast(String(err));
    }
  }, [activeTab.path, store]);

  const handleRename = useCallback(async () => {
    if (activePane.selectedPaths.length !== 1) return;
    const target = activePane.selectedPaths[0];
    const nextName = window.prompt("Rename to:", baseName(target));
    if (!nextName?.trim()) return;
    try {
      await invoke("rename_entry", { path: target, newName: nextName.trim() });
      store.showToast(`Renamed to "${nextName.trim()}"`);
    } catch (err) {
      store.showToast(String(err));
    }
  }, [activePane.selectedPaths, store]);

  const handleTrash = useCallback(async () => {
    if (activePane.selectedPaths.length === 0) return;
    try {
      await invoke("move_to_trash", { paths: activePane.selectedPaths });
      store.setSelection(activePane.id, []);
      store.showToast(`Moved ${activePane.selectedPaths.length} item(s) to Trash`);
    } catch (err) {
      store.showToast(String(err));
    }
  }, [activePane.id, activePane.selectedPaths, store]);

  const handlePaste = useCallback(async () => {
    const clip = store.clipboard;
    if (!clip || clip.paths.length === 0) return;
    try {
      if (clip.mode === "copy") {
        await invoke("copy_entries", { sources: clip.paths, destDir: activeTab.path });
        store.showToast(`Copied ${clip.paths.length} item(s)`);
      } else {
        await invoke("move_entries", { sources: clip.paths, destDir: activeTab.path });
        store.setClipboard(null);
        store.showToast(`Moved ${clip.paths.length} item(s)`);
      }
    } catch (err) {
      store.showToast(String(err));
    }
  }, [store, activeTab.path]);

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

  // Global Linux File Manager Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (e.code === "Space") {
        e.preventDefault();
        store.togglePreview();
      } else if (e.ctrlKey && e.key === "h") {
        e.preventDefault();
        store.toggleHidden();
      } else if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        store.toggleTerminal();
      } else if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        store.toggleSplitView();
      } else if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        store.addTab(activePane.id);
      } else if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        store.closeTab(activePane.id, activeTab.id);
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        store.goBack(activePane.id);
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        store.goForward(activePane.id);
      } else if (e.key === "F2") {
        e.preventDefault();
        handleRename();
      } else if (e.key === "Delete") {
        e.preventDefault();
        handleTrash();
      } else if (e.ctrlKey && e.key === "c" && activePane.selectedPaths.length > 0) {
        e.preventDefault();
        store.setClipboard({ mode: "copy", paths: activePane.selectedPaths });
        store.showToast(`Copied ${activePane.selectedPaths.length} item(s)`);
      } else if (e.ctrlKey && e.key === "x" && activePane.selectedPaths.length > 0) {
        e.preventDefault();
        store.setClipboard({ mode: "cut", paths: activePane.selectedPaths });
        store.showToast(`Cut ${activePane.selectedPaths.length} item(s)`);
      } else if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePane, activeTab, store, handleRename, handleTrash, handlePaste]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      <Sidebar
        userDirs={userDirs}
        mounts={mounts}
        pinnedPaths={store.pinnedPaths}
        activePath={activeTab.path}
        onNavigate={(path) => store.navigate(activePane.id, path)}
        onUnpin={store.togglePin}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          currentPath={activeTab.path}
          canBack={activeTab.historyIndex > 0}
          canForward={activeTab.historyIndex < activeTab.history.length - 1}
          isPinned={store.pinnedPaths.includes(activeTab.path)}
          viewMode={store.viewMode}
          splitView={store.splitView}
          showHidden={store.showHidden}
          showPreview={store.showPreview}
          showTerminal={store.showTerminal}
          showDiskUsage={store.showDiskUsage}
          onBack={() => store.goBack(activePane.id)}
          onForward={() => store.goForward(activePane.id)}
          onNavigate={(path) => store.navigate(activePane.id, path)}
          onTogglePin={() => store.togglePin(activeTab.path)}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onViewMode={store.setViewMode}
          onToggleSplit={store.toggleSplitView}
          onToggleHidden={store.toggleHidden}
          onTogglePreview={store.togglePreview}
          onToggleTerminal={store.toggleTerminal}
          onToggleDiskUsage={store.toggleDiskUsage}
        />

        <div className="flex-1 flex min-h-0">
          {store.panes.map((pane) => (
            <ExplorerPane
              key={pane.id}
              pane={pane}
              isActive={pane.id === store.activePaneId}
              viewMode={store.viewMode}
              showHidden={store.showHidden}
              onActivate={() => store.setActivePane(pane.id)}
              onNavigate={(path) => store.navigate(pane.id, path)}
              onAddTab={() => store.addTab(pane.id)}
              onCloseTab={(tabId) => store.closeTab(pane.id, tabId)}
              onSelectTab={(tabId) => store.setActiveTab(pane.id, tabId)}
              onSelectPaths={(paths) => store.setSelection(pane.id, paths)}
              onActiveEntryChange={setActiveEntry}
              onDropEntries={handleDropEntries}
            />
          ))}

          {store.showPreview && (
            <QuickPreviewPanel entry={activeEntry} onClose={store.togglePreview} />
          )}
        </div>

        {store.showTerminal && (
          <TerminalDrawer cwd={activeTab.path} onClose={store.toggleTerminal} />
        )}
      </div>

      {store.showDiskUsage && (
        <DiskUsageOverlay
          path={activeTab.path}
          onNavigate={(path) => store.navigate(activePane.id, path)}
          onClose={store.toggleDiskUsage}
        />
      )}

      {store.toast && (
        <div className="fixed bottom-10 right-6 z-50 px-3.5 py-2 rounded-lg border border-white/15 bg-zinc-900/95 backdrop-blur-md text-xs text-zinc-100 shadow-xl">
          {store.toast}
        </div>
      )}
    </div>
  );
};
