# Easy File

A modern, high-performance Linux File Manager built with **Rust + Tauri v2 + React (TypeScript) + Tailwind CSS**.

## Features
- **High-Speed Async Directory Streaming:** Batched `tokio::fs` reads over Tauri v2 `Channel` with instant cancellation on navigation.
- **Real-Time `inotify` Watching:** Debounced filesystem change events that keep open panes in sync.
- **File Operations & XDG Trash:** Create, rename, recursive copy/move (including cross-device), drag-and-drop, and FreeDesktop Trash support.
- **Multi-Tab & Dual-Pane Split View:** Navigate side-by-side with tabs, history, and editable breadcrumbs.
- **Multiple View Modes:** Grid view (with `localfile://` image thumbnails), virtualized Detailed List view (`@tanstack/react-virtual`), and Column view.
- **Quick Preview (`Space`):** Inspect images, text/code/markdown, PDFs, audio, and file metadata.
- **Disk Usage Breakdown:** Parallel `jwalk` directory size analyzer.
- **Integrated Terminal (`Ctrl+\``):** Real `xterm.js` + `portable-pty` shell synced to your active directory.
- **Linux Mounts & GVFS:** Sidebar access to XDG user folders, pinned directories, mounted drives, and GVFS shares.

## Getting Started

```bash
npm install
npm run tauri dev
```
