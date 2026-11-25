import React from "react";
import {
  FileArchive,
  FileCode2,
  FileText,
  Film,
  Folder,
  Image as ImageIcon,
  Music,
} from "lucide-react";
import { FileEntry } from "../../types/fs";
import { useTheme } from "../../context/ThemeContext";

const CODE_EXTS = new Set([
  "rs", "ts", "tsx", "js", "jsx", "py", "go", "c", "cpp", "h", "hpp", "json", "toml", "yaml", "yml", "sh", "html", "css",
]);
const ARCHIVE_EXTS = new Set(["zip", "tar", "gz", "tgz", "7z", "rar", "xz", "bz2", "iso"]);

interface EntryIconProps {
  entry: Pick<FileEntry, "isDir" | "mimeType" | "extension">;
  size?: "sm" | "md";
}

export const EntryIcon: React.FC<EntryIconProps> = ({ entry, size = "md" }) => {
  const { iconPack } = useTheme();
  const cls = size === "sm" ? "w-4 h-4 shrink-0" : "w-11 h-11";
  const strokeWidth = iconPack === "outline" ? 1.5 : iconPack === "minimal" ? 1.6 : 1.9;
  const mono = iconPack === "minimal";

  if (entry.isDir) {
    const folderStyle = mono
      ? "text-muted"
      : iconPack === "duotone"
      ? "text-folder fill-folder/20"
      : "text-folder";
    return <Folder className={`${cls} ${folderStyle}`} strokeWidth={strokeWidth} />;
  }

  if (entry.mimeType?.startsWith("image/")) {
    return (
      <ImageIcon
        className={`${cls} ${mono ? "text-muted" : "text-success"}`}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (entry.mimeType?.startsWith("video/")) {
    return (
      <Film
        className={`${cls} ${mono ? "text-muted" : "text-secondary"}`}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (entry.mimeType?.startsWith("audio/")) {
    return (
      <Music
        className={`${cls} ${mono ? "text-muted" : "text-danger"}`}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (entry.extension && ARCHIVE_EXTS.has(entry.extension)) {
    return (
      <FileArchive
        className={`${cls} ${mono ? "text-muted" : "text-secondary"}`}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (entry.extension && CODE_EXTS.has(entry.extension)) {
    return (
      <FileCode2
        className={`${cls} ${mono ? "text-muted" : "text-warning"}`}
        strokeWidth={strokeWidth}
      />
    );
  }

  return <FileText className={`${cls} text-muted`} strokeWidth={strokeWidth} />;
};
