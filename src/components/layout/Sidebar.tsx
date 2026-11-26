import React from "react";
import {
  Cloud,
  CloudUpload,
  Download,
  FileText,
  Film,
  Folder,
  Globe,
  HardDrive,
  Home,
  Image as ImageIcon,
  Music,
  Pin,
  PinOff,
  Plus,
  Server,
  Trash2,
  Usb,
} from "lucide-react";
import { MountPoint, UserDirsInfo } from "../../types/fs";
import { NetworkBookmark, RcloneRemote, SyncRule } from "../../types/network";
import { baseName, formatBytes } from "../../lib/format";

interface SidebarProps {
  userDirs: UserDirsInfo | null;
  mounts: MountPoint[];
  pinnedPaths: string[];
  networkBookmarks: NetworkBookmark[];
  cloudRemotes: RcloneRemote[];
  syncRules: SyncRule[];
  activePath: string;
  onNavigate: (path: string) => void;
  onUnpin: (path: string) => void;
  onOpenConnectNetwork: () => void;
  onOpenCloudSync: () => void;
  onClickNetworkBookmark: (bookmark: NetworkBookmark) => void;
  onClickCloudRemote: (remote: RcloneRemote) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userDirs,
  mounts,
  pinnedPaths,
  networkBookmarks,
  cloudRemotes,
  syncRules,
  activePath,
  onNavigate,
  onUnpin,
  onOpenConnectNetwork,
  onOpenCloudSync,
  onClickNetworkBookmark,
  onClickCloudRemote,
}) => {
  const quickLinks = [
    userDirs?.home && { label: "Home", path: userDirs.home, icon: <Home className="w-4 h-4" /> },
    userDirs?.downloads && {
      label: "Downloads",
      path: userDirs.downloads,
      icon: <Download className="w-4 h-4" />,
    },
    userDirs?.documents && {
      label: "Documents",
      path: userDirs.documents,
      icon: <FileText className="w-4 h-4" />,
    },
    userDirs?.pictures && {
      label: "Pictures",
      path: userDirs.pictures,
      icon: <ImageIcon className="w-4 h-4" />,
    },
    userDirs?.music && {
      label: "Music",
      path: userDirs.music,
      icon: <Music className="w-4 h-4" />,
    },
    userDirs?.videos && {
      label: "Videos",
      path: userDirs.videos,
      icon: <Film className="w-4 h-4" />,
    },
    userDirs?.home && {
      label: "Trash",
      path: `${userDirs.home}/.local/share/Trash/files`,
      icon: <Trash2 className="w-4 h-4" />,
    },
  ].filter(Boolean) as { label: string; path: string; icon: React.ReactNode }[];

  const activeSyncCount = syncRules.filter((r) => r.enabled).length;
  const isSyncing = syncRules.some((r) => r.lastStatus === "syncing");

  return (
    <aside className="w-60 shrink-0 border-r border-subtle bg-mantle/80 backdrop-blur-md flex flex-col overflow-y-auto p-3 space-y-5">
      {/* Quick Access */}
      <div>
        <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Quick Access
        </p>
        <nav className="space-y-0.5">
          {quickLinks.map((item) => {
            const active = activePath === item.path;
            return (
              <button
                key={item.label}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm border transition ${
                  active
                    ? "bg-accent/15 border-selected/60 text-accent font-medium"
                    : "border-transparent text-main/90 hover:bg-surface/80"
                }`}
              >
                <span className={active ? "text-accent" : "text-muted"}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Pinned */}
      {pinnedPaths.length > 0 && (
        <div>
          <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Pinned
          </p>
          <div className="space-y-0.5">
            {pinnedPaths.map((pin) => {
              const active = activePath === pin;
              return (
                <div
                  key={pin}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm border transition ${
                    active
                      ? "bg-accent/15 border-selected/60 text-accent"
                      : "border-transparent text-main/90 hover:bg-surface/80"
                  }`}
                >
                  <button
                    onClick={() => onNavigate(pin)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <Pin className="w-3.5 h-3.5 text-warning shrink-0" />
                    <span className="truncate">{baseName(pin)}</span>
                  </button>
                  <button
                    onClick={() => onUnpin(pin)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-main"
                    title="Unpin"
                  >
                    <PinOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Network & Cloud Backup */}
      <div>
        <div className="px-2 mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Network &amp; Cloud
          </span>
          <button
            onClick={onOpenConnectNetwork}
            className="p-0.5 rounded hover:bg-surface text-muted hover:text-accent transition"
            title="Connect Network Drive (SMB/SFTP/FTP/WebDAV)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-0.5">
          {/* Google Drive & Dropbox Auto-Sync Manager Button */}
          <button
            onClick={onOpenCloudSync}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-subtle/60 bg-base/50 hover:bg-surface/80 hover:border-selected text-xs text-main transition mb-1.5"
          >
            <span className="flex items-center gap-2 min-w-0">
              <CloudUpload
                className={`w-3.5 h-3.5 shrink-0 ${
                  isSyncing ? "text-success animate-pulse" : "text-accent"
                }`}
              />
              <span className="truncate font-medium">Cloud Auto-Sync</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface text-[10px] text-muted">
              {isSyncing ? "Syncing" : `${activeSyncCount} on`}
            </span>
          </button>

          {networkBookmarks.map((bm) => (
            <button
              key={bm.id}
              onClick={() => onClickNetworkBookmark(bm)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition ${
                bm.mountPath && activePath === bm.mountPath
                  ? "bg-accent/15 border-selected/60 text-accent"
                  : "border-transparent text-main/90 hover:bg-surface/80"
              }`}
              title={bm.uri}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Server className="w-3.5 h-3.5 text-secondary shrink-0" />
                <span className="truncate">{bm.name}</span>
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  bm.mounted ? "bg-success" : "bg-subtle"
                }`}
                title={bm.mounted ? "Mounted" : "Click to mount"}
              />
            </button>
          ))}

          {cloudRemotes.map((remote) => (
            <button
              key={remote.name}
              onClick={() => onClickCloudRemote(remote)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition ${
                remote.mountPath && activePath === remote.mountPath
                  ? "bg-accent/15 border-selected/60 text-accent"
                  : "border-transparent text-main/90 hover:bg-surface/80"
              }`}
              title={`${remote.name} (${remote.provider})`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Cloud className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">{remote.name}</span>
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  remote.mounted ? "bg-success" : "bg-subtle"
                }`}
                title={remote.mounted ? "Mounted" : "Click to mount"}
              />
            </button>
          ))}

          <button
            onClick={onOpenConnectNetwork}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-main hover:bg-surface/70 transition"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Connect Server…</span>
          </button>
        </div>
      </div>

      {/* Local Drives & Mounts */}
      <div>
        <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Drives &amp; Mounts
        </p>
        <div className="space-y-1.5">
          {mounts.map((mount) => {
            const used = Math.max(0, mount.totalBytes - mount.availableBytes);
            const pct = mount.totalBytes > 0 ? Math.round((used / mount.totalBytes) * 100) : 0;
            const active = activePath === mount.mountPath;
            return (
              <button
                key={mount.mountPath}
                onClick={() => onNavigate(mount.mountPath)}
                className={`w-full text-left px-2.5 py-2 rounded-lg border transition ${
                  active
                    ? "bg-accent/15 border-selected/60"
                    : "border-transparent hover:bg-surface/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-sm text-main">
                  <div className="flex items-center gap-2 min-w-0">
                    {mount.isGvfs ? (
                      <Globe className="w-4 h-4 text-success shrink-0" />
                    ) : mount.isRemovable ? (
                      <Usb className="w-4 h-4 text-warning shrink-0" />
                    ) : (
                      <HardDrive className="w-4 h-4 text-muted shrink-0" />
                    )}
                    <span className="truncate">{mount.name}</span>
                  </div>
                  <span className="text-[10px] uppercase text-muted font-mono">
                    {mount.fsType}
                  </span>
                </div>
                {mount.totalBytes > 0 && (
                  <>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct > 85 ? "bg-danger" : "bg-accent"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted">
                      <span>{formatBytes(mount.availableBytes)} free</span>
                      <span>{pct}%</span>
                    </div>
                  </>
                )}
              </button>
            );
          })}
          {mounts.length === 0 && (
            <div className="px-2.5 py-1.5 text-xs text-muted flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" /> No extra mounts detected
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
