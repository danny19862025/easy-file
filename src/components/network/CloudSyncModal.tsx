import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle2,
  Cloud,
  CloudUpload,
  FolderOpen,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";
import { RcloneRemote, SyncRule } from "../../types/network";
import { formatDate } from "../../lib/format";

interface CloudSyncModalProps {
  currentPath: string;
  remotes: RcloneRemote[];
  rules: SyncRule[];
  onRefresh: () => void;
  onNavigate: (path: string) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  currentPath,
  remotes,
  rules,
  onRefresh,
  onNavigate,
  onToast,
  onClose,
}) => {
  const [provider, setProvider] = useState<"google-drive" | "dropbox">("google-drive");
  const [remoteName, setRemoteName] = useState(remotes[0]?.name ?? "gdrive");
  const [localPath, setLocalPath] = useState(currentPath);
  const [remotePath, setRemotePath] = useState("EasyFileBackup");
  const [mode, setMode] = useState<"backup" | "mirror">("backup");
  const [intervalMins, setIntervalMins] = useState(15);
  const [name, setName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (remotes.length > 0 && !remotes.some((r) => r.name === remoteName)) {
      setRemoteName(remotes[0].name);
    }
  }, [remotes, remoteName]);

  const handleMountRemote = async (remote: RcloneRemote) => {
    setBusyId(`mount-${remote.name}`);
    try {
      if (remote.mounted && remote.mountPath) {
        await invoke("unmount_cloud_remote", { mountPath: remote.mountPath });
        onToast(`Unmounted ${remote.name}`);
      } else {
        const mountedAt = await invoke<string>("mount_cloud_remote", { remoteName: remote.name });
        onToast(`Mounted ${remote.name} at ${mountedAt}`);
        onNavigate(mountedAt);
      }
      onRefresh();
    } catch (err) {
      onToast(String(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invoke("add_sync_rule", {
        name: name.trim() || `${provider === "google-drive" ? "Google Drive" : "Dropbox"} Backup`,
        provider,
        remoteName: remoteName.trim(),
        localPath: localPath.trim(),
        remotePath: remotePath.trim(),
        mode,
        intervalMins,
      });
      setName("");
      onToast("Auto-sync backup rule added");
      onRefresh();
    } catch (err) {
      onToast(String(err));
    }
  };

  const handleSyncNow = async (id: string) => {
    setBusyId(id);
    try {
      const updated = await invoke<SyncRule>("run_sync_rule_now", { id });
      if (updated.lastStatus === "ok") {
        onToast(`Synced "${updated.name}" successfully`);
      } else {
        onToast(updated.lastError ?? "Sync failed");
      }
      onRefresh();
    } catch (err) {
      onToast(String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-crust/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[86vh] rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CloudUpload className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-main">
                Google Drive &amp; Dropbox Backup / Auto-Sync
              </h2>
              <p className="text-xs text-muted">
                Powered by native Linux rclone with background scheduled auto-sync
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-main"
              title="Refresh Remotes & Rules"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-main"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Connected Cloud Remotes */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Connected Cloud Accounts (rclone)
              </h3>
              <span className="text-[11px] text-muted font-mono">
                Add account: rclone config
              </span>
            </div>

            {remotes.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-subtle bg-base/70 text-xs text-muted space-y-1.5">
                <p className="text-main font-medium">No Google Drive or Dropbox remotes configured yet.</p>
                <p>
                  Open the integrated terminal (<kbd className="px-1 py-0.5 rounded bg-surface font-mono text-[10px]">Ctrl+`</kbd>) and run{" "}
                  <code className="text-accent font-mono">rclone config</code> to authenticate{" "}
                  <strong>Google Drive</strong> (type <code className="font-mono">drive</code>) or{" "}
                  <strong>Dropbox</strong> (type <code className="font-mono">dropbox</code>), then click Refresh.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {remotes.map((remote) => (
                  <div
                    key={remote.name}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-subtle bg-base/70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Cloud className="w-4 h-4 text-accent shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-main truncate">{remote.name}</p>
                        <p className="text-[10px] uppercase text-muted">{remote.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {remote.mounted && remote.mountPath && (
                        <button
                          onClick={() => {
                            onNavigate(remote.mountPath!);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg bg-surface hover:bg-accent/20 text-main hover:text-accent"
                          title="Browse Mounted Cloud Drive"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        disabled={busyId === `mount-${remote.name}`}
                        onClick={() => handleMountRemote(remote)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                          remote.mounted
                            ? "border-danger/40 text-danger hover:bg-danger/15"
                            : "border-subtle bg-surface text-main hover:border-selected"
                        }`}
                      >
                        {busyId === `mount-${remote.name}`
                          ? "…"
                          : remote.mounted
                          ? "Unmount"
                          : "Mount"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Create Auto-Sync Backup Rule */}
          <form
            onSubmit={handleAddRule}
            className="p-4 rounded-xl border border-subtle bg-base/60 space-y-3"
          >
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              New Auto-Sync Backup Rule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-muted mb-1">Cloud Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as "google-drive" | "dropbox")}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-mantle border border-subtle text-xs text-main outline-none"
                >
                  <option value="google-drive">Google Drive</option>
                  <option value="dropbox">Dropbox</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-muted mb-1">rclone Remote Name</label>
                <input
                  required
                  value={remoteName}
                  onChange={(e) => setRemoteName(e.target.value)}
                  placeholder="gdrive or dropbox"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-mantle border border-subtle text-xs text-main font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted mb-1">Auto-Sync Interval</label>
                <select
                  value={intervalMins}
                  onChange={(e) => setIntervalMins(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-mantle border border-subtle text-xs text-main outline-none"
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 1 hour</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-muted mb-1">Local Folder to Back Up</label>
                <input
                  required
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-mantle border border-subtle text-xs text-main font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted mb-1">Cloud Destination Folder</label>
                <input
                  required
                  value={remotePath}
                  onChange={(e) => setRemotePath(e.target.value)}
                  placeholder="Backups/Documents"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-mantle border border-subtle text-xs text-main font-mono outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-3 text-xs text-muted">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === "backup"}
                    onChange={() => setMode("backup")}
                  />
                  <span>Safe Backup (copy)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === "mirror"}
                    onChange={() => setMode("mirror")}
                  />
                  <span>Exact Mirror (sync)</span>
                </label>
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-crust text-xs font-semibold hover:opacity-90 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Auto-Sync Rule</span>
              </button>
            </div>
          </form>

          {/* Active Auto-Sync Rules */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Active Backup &amp; Auto-Sync Rules ({rules.length})
            </h3>
            {rules.length === 0 ? (
              <p className="text-xs text-muted py-2">No auto-sync backup rules configured yet.</p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => {
                  const syncing = rule.lastStatus === "syncing" || busyId === rule.id;
                  return (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl border border-subtle bg-base/75 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <HardDrive className="w-4 h-4 text-secondary shrink-0" />
                          <span className="text-xs font-semibold text-main truncate">
                            {rule.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface text-[10px] text-muted uppercase">
                            {rule.provider === "google-drive" ? "Google Drive" : "Dropbox"} •{" "}
                            {rule.intervalMins}m
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={async (e) => {
                                await invoke("toggle_sync_rule", {
                                  id: rule.id,
                                  enabled: e.target.checked,
                                });
                                onRefresh();
                              }}
                            />
                            <span>Auto</span>
                          </label>
                          <button
                            disabled={syncing}
                            onClick={() => handleSyncNow(rule.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 border border-selected/60 text-accent text-[11px] font-medium hover:bg-accent/25 disabled:opacity-50"
                          >
                            {syncing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span>{syncing ? "Syncing…" : "Sync Now"}</span>
                          </button>
                          <button
                            onClick={async () => {
                              await invoke("delete_sync_rule", { id: rule.id });
                              onRefresh();
                            }}
                            className="p-1 rounded hover:bg-danger/15 text-muted hover:text-danger"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-muted flex items-center justify-between gap-2">
                        <span className="truncate">
                          {rule.localPath} → {rule.remoteName}:{rule.remotePath}
                        </span>
                        <span className="flex items-center gap-1 shrink-0 font-sans">
                          {rule.lastStatus === "ok" && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          )}
                          {rule.lastStatus === "error" && (
                            <AlertCircle className="w-3.5 h-3.5 text-danger" />
                          )}
                          {rule.lastSyncMs ? formatDate(rule.lastSyncMs) : "Never synced"}
                        </span>
                      </div>

                      {rule.lastError && (
                        <p className="text-[11px] text-danger bg-danger/10 px-2 py-1 rounded">
                          {rule.lastError}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
