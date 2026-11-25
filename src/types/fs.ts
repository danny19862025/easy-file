export type ViewMode = "grid" | "list" | "details" | "miller" | "tree";

export interface FileEntry {
  name: string;
  path: string;
  kind: "directory" | "file" | "symlink" | "other";
  isDir: boolean;
  isHidden: boolean;
  isSymlink: boolean;
  symlinkTarget?: string;
  size: number;
  modifiedMs?: number;
  permissionsOctal: number;
  extension?: string;
  mimeType?: string;
}

export type DirStreamEvent =
  | { event: "batch"; data: { requestId: number; entries: FileEntry[] } }
  | { event: "complete"; data: { requestId: number; totalCount: number; elapsedMs: number } }
  | { event: "error"; data: { requestId: number; message: string } };

export interface MountPoint {
  name: string;
  mountPath: string;
  fsType: string;
  totalBytes: number;
  availableBytes: number;
  isRemovable: boolean;
  isGvfs: boolean;
}

export interface UserDirsInfo {
  home: string;
  desktop?: string;
  documents?: string;
  downloads?: string;
  pictures?: string;
  music?: string;
  videos?: string;
}

export interface DiskUsageEntry {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  percentage: number;
}

export interface DiskUsageReport {
  rootPath: string;
  totalBytes: number;
  itemCount: number;
  entries: DiskUsageEntry[];
}

export type PreviewData =
  | { kind: "text"; content: string; truncated: boolean; mime: string }
  | { kind: "image"; url: string; mime: string }
  | { kind: "video"; url: string; mime: string }
  | { kind: "audio"; url: string; mime: string }
  | { kind: "pdf"; url: string }
  | { kind: "binary"; mime: string; size: number };

export interface FsDeltaEvent {
  paneId: string;
  watchedPath: string;
  changedPaths: string[];
}
