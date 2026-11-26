export interface NetworkBookmark {
  id: string;
  name: string;
  protocol: "smb" | "sftp" | "ftp" | "dav" | "davs" | string;
  uri: string;
  mountPath?: string | null;
  mounted: boolean;
}

export interface RcloneRemote {
  name: string;
  provider: string;
  mountPath?: string | null;
  mounted: boolean;
}

export interface SyncRule {
  id: string;
  name: string;
  provider: "google-drive" | "dropbox" | string;
  remoteName: string;
  localPath: string;
  remotePath: string;
  mode: "backup" | "mirror" | string;
  intervalMins: number;
  enabled: boolean;
  lastSyncMs?: number | null;
  lastStatus: "idle" | "syncing" | "ok" | "error" | string;
  lastError?: string | null;
}
