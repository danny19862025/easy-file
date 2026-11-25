import { useEffect, useRef, useState } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { DirStreamEvent, FileEntry, FsDeltaEvent } from "../types/fs";

export function useDirectoryStream(paneId: string, path: string, showHidden: boolean) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const requestIdRef = useRef(0);

  // Subscribe to real-time inotify delta events for this pane
  useEffect(() => {
    let active = true;
    invoke("watch_directory", { paneId, path }).catch(() => {});

    const unlistenPromise = listen<FsDeltaEvent>("fs:delta", (event) => {
      if (!active) return;
      if (event.payload.paneId === paneId && event.payload.watchedPath === path) {
        setRefreshTick((t) => t + 1);
      }
    });

    return () => {
      active = false;
      unlistenPromise.then((fn) => fn());
    };
  }, [paneId, path]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const buffer: FileEntry[] = [];
    let rafHandle: number | null = null;

    setError(null);
    setIsLoading(true);

    const flush = () => {
      rafHandle = null;
      if (requestIdRef.current !== requestId) return;
      const sorted = [...buffer].sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      });
      setEntries(sorted);
    };

    const channel = new Channel<DirStreamEvent>();
    channel.onmessage = (msg) => {
      if (msg.data.requestId !== requestId) return;

      if (msg.event === "batch") {
        buffer.push(...msg.data.entries);
        if (rafHandle === null) {
          rafHandle = requestAnimationFrame(flush);
        }
      } else if (msg.event === "complete") {
        if (rafHandle !== null) cancelAnimationFrame(rafHandle);
        flush();
        setElapsedMs(msg.data.elapsedMs);
        setIsLoading(false);
      } else if (msg.event === "error") {
        setError(msg.data.message);
        setIsLoading(false);
      }
    };

    invoke("read_directory_stream", {
      paneId,
      path,
      showHidden,
      requestId,
      onEvent: channel,
    }).catch((err) => {
      if (requestIdRef.current === requestId) {
        setError(String(err));
        setIsLoading(false);
      }
    });

    return () => {
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
    };
  }, [paneId, path, showHidden, refreshTick]);

  const reload = () => setRefreshTick((t) => t + 1);

  return { entries, isLoading, elapsedMs, error, reload };
}
