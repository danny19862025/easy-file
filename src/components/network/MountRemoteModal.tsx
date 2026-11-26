import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Globe, Loader2, Server, X } from "lucide-react";
import { NetworkBookmark } from "../../types/network";

interface MountRemoteModalProps {
  onConnected: (bookmark: NetworkBookmark) => void;
  onClose: () => void;
}

const PROTOCOLS = [
  { id: "smb", label: "SMB / Windows", defaultPort: "" },
  { id: "sftp", label: "SFTP / SSH", defaultPort: "22" },
  { id: "ftp", label: "FTP", defaultPort: "21" },
  { id: "davs", label: "WebDAV (HTTPS)", defaultPort: "443" },
];

export const MountRemoteModal: React.FC<MountRemoteModalProps> = ({ onConnected, onClose }) => {
  const [protocol, setProtocol] = useState("smb");
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [sharePath, setSharePath] = useState("");
  const [username, setUsername] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      const parsedPort = port.trim() ? Number(port.trim()) : null;
      const bookmark = await invoke<NetworkBookmark>("connect_network", {
        name: name.trim(),
        protocol,
        host: host.trim(),
        port: parsedPort && !Number.isNaN(parsedPort) ? parsedPort : null,
        sharePath: sharePath.trim() || null,
        username: username.trim() || null,
      });
      onConnected(bookmark);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-crust/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-subtle bg-mantle/95 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-main">Connect Network Drive</h2>
              <p className="text-xs text-muted">
                Mount SMB, SFTP, FTP, or WebDAV via Linux GVFS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-main"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Protocol Picker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {PROTOCOLS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProtocol(p.id);
                  setPort(p.defaultPort);
                }}
                className={`px-2.5 py-2 rounded-lg border text-xs font-medium transition ${
                  protocol === p.id
                    ? "bg-accent/15 border-selected text-accent"
                    : "bg-base/70 border-subtle/70 text-muted hover:text-main"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] text-muted mb-1">Server / IP Address *</label>
              <input
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.50 or nas.local"
                className="w-full px-3 py-2 rounded-lg bg-base border border-subtle focus:border-selected text-xs text-main outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Port</label>
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="Default"
                className="w-full px-3 py-2 rounded-lg bg-base border border-subtle focus:border-selected text-xs text-main outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted mb-1">Share / Remote Path</label>
              <input
                value={sharePath}
                onChange={(e) => setSharePath(e.target.value)}
                placeholder={protocol === "smb" ? "media" : "/home/user"}
                className="w-full px-3 py-2 rounded-lg bg-base border border-subtle focus:border-selected text-xs text-main outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Username (Optional)</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="danny"
                className="w-full px-3 py-2 rounded-lg bg-base border border-subtle focus:border-selected text-xs text-main outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-muted mb-1">Display Label (Optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Home NAS / Dev Server"
              className="w-full px-3 py-2 rounded-lg bg-base border border-subtle focus:border-selected text-xs text-main outline-none"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg border border-danger/40 bg-danger/10 text-xs text-danger">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-subtle bg-surface/60 text-xs text-main"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting || !host.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-crust text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Server className="w-3.5 h-3.5" />
              )}
              <span>{connecting ? "Connecting…" : "Connect & Mount"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
