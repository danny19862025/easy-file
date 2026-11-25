import React, { useEffect, useRef } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { X } from "lucide-react";

interface TerminalDrawerProps {
  cwd: string;
  onClose: () => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({ cwd, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(`pty-${Date.now()}`);
  const lastCwdRef = useRef(cwd);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const sessionId = sessionIdRef.current;
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "JetBrains Mono, Fira Code, monospace",
      theme: {
        background: "#09090b",
        foreground: "#e4e4e7",
        cursor: "#60a5fa",
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(el);
    fitAddon.fit();

    const channel = new Channel<string>();
    channel.onmessage = (chunk) => term.write(chunk);

    invoke("spawn_pty", {
      sessionId,
      cwd,
      cols: term.cols,
      rows: term.rows,
      onOutput: channel,
    }).catch((err) => {
      term.writeln(`\r\n[Failed to start PTY: ${String(err)}]`);
    });

    const dataSub = term.onData((data) => {
      invoke("write_pty", { sessionId, data }).catch(() => {});
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      invoke("resize_pty", { sessionId, cols: term.cols, rows: term.rows }).catch(() => {});
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      dataSub.dispose();
      term.dispose();
      invoke("close_pty", { sessionId }).catch(() => {});
    };
  }, []);

  // Sync terminal CWD when user navigates to a new folder
  useEffect(() => {
    if (lastCwdRef.current !== cwd) {
      lastCwdRef.current = cwd;
      const escaped = cwd.replace(/'/g, "'\\''");
      invoke("write_pty", {
        sessionId: sessionIdRef.current,
        data: `cd '${escaped}'\n`,
      }).catch(() => {});
    }
  }, [cwd]);

  return (
    <section className="h-56 shrink-0 border-t border-white/10 bg-zinc-950 flex flex-col">
      <div className="h-8 px-3 border-b border-white/10 bg-zinc-900/70 flex items-center justify-between text-xs text-zinc-400">
        <span className="font-mono truncate">Terminal — {cwd}</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 hover:text-zinc-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 p-1.5 overflow-hidden" />
    </section>
  );
};
