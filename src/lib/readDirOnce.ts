import { Channel, invoke } from "@tauri-apps/api/core";
import { DirStreamEvent, FileEntry } from "../types/fs";

let onceSeq = 100000;

/** One-shot async directory reader for Miller Columns and Tree View expansion. */
export async function readDirOnce(path: string, showHidden: boolean): Promise<FileEntry[]> {
  const requestId = ++onceSeq;
  const entries: FileEntry[] = [];

  return new Promise((resolve, reject) => {
    const channel = new Channel<DirStreamEvent>();
    channel.onmessage = (msg) => {
      if (msg.data.requestId !== requestId) return;
      if (msg.event === "batch") {
        entries.push(...msg.data.entries);
      } else if (msg.event === "complete") {
        entries.sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        });
        resolve(entries);
      } else if (msg.event === "error") {
        reject(new Error(msg.data.message));
      }
    };

    invoke("read_directory_stream", {
      paneId: `oneshot-${requestId}`,
      path,
      showHidden,
      requestId,
      onEvent: channel,
    }).catch(reject);
  });
}
