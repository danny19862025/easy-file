import React, { useEffect, useRef } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface TerminalDrawerProps {
  cwd: string;
  onClose: () => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({ cwd, onClose }) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
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
      theme: theme.terminal,
    });
    termRef.current = term;
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
      termRef.current = null;
      invoke("close_pty", { sessionId }).catch(() => {});
    };
  }, []);

  // Dynamically update xterm.js colors when theme changes
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = theme.terminal;
    }
  }, [theme.terminal]);

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
    <section className="h-56 shrink-0 border-t border-subtle bg-crust flex flex-col">
      <div className="h-8 px-3 border-b border-subtle bg-mantle/80 flex items-center justify-between text-xs text-muted">
        <span className="font-mono truncate">Terminal — {cwd}</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-surface hover:text-main">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 p-1.5 overflow-hidden" />
    </section>
  );
};
