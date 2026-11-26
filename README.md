# Easy File

A modern, high-performance Linux File Manager built with **Rust + Tauri v2 + React 19 + Tailwind CSS v4**. Designed for X11 and Wayland desktops with instant directory streaming, a Catppuccin-powered theme engine, searchable context menus, multi-layout views, and an integrated PTY terminal.

---

## Features

- **Instant Fuzzy Search (`Ctrl+F` / `/`):** Non-blocking parallel indexing (`jwalk`) with highlighted matched substrings, parent path display, and millisecond latency readout.
- **High-Speed Async Directory Streaming:** Batched `tokio::fs` reads over Tauri v2 `Channel` with instant cancellation when switching directories rapidly.
- **Real-Time `inotify` Watching:** Debounced filesystem change events keep open panes in sync automatically.
- **5 Multi-Layout Views (`Ctrl+1` – `Ctrl+5`):** Switch per pane between **Grid** (with live image thumbnails), **Compact List**, **Details** (virtualized table), **Miller Columns**, and **Tree** hierarchy views.
- **Multi-Tab & Draggable Split Panes (`Ctrl+\`):** Independent tabs, navigation history, selection state, and view modes per pane with a draggable resize handle.
- **Persistent Drop Zone Shelf (`Ctrl+B`):** Drag or park files from multiple folders, navigate freely, and Move or Copy them all at once into any target folder.
- **Searchable Context Menu:** Right-click any file, folder, or empty space and start typing to filter actions (`↑`/`↓`/`Enter`).
- **Floating Quick Look (`Space`):** Preview images (with natural `W × H` pixel resolution), video, audio, text/code, and PDFs without leaving the explorer.
- **9 Built-in Themes & 3 Icon Packs (`Ctrl+,`):** *Catppuccin Mocha (Default), Light, Graphite, Midnight, Noir, Nord, Dracula, Rosé Pine, Tokyo Night* + *Duotone, Outline, Minimal* icon packs.
- **Disk Usage Breakdown (`Ctrl+D`):** Parallel directory size analyzer with proportional storage bars.
- **Integrated Terminal (`Ctrl+\``):** Real `xterm.js` + `portable-pty` shell synced to your active directory.
- **Linux System Integration:** XDG user directories, FreeDesktop Trash, mounted drives with capacity bars, and GVFS mounts (`$XDG_RUNTIME_DIR/gvfs`).

---

## Installation Guide

### 1. System Prerequisites

Install Node.js (v20+), Rust (`rustup`), and the Tauri Linux WebKitGTK libraries for your distribution:

#### Arch Linux
```bash
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg nodejs npm rustup
```

#### Ubuntu / Debian
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev nodejs npm
```

#### Fedora
```bash
sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel nodejs npm
sudo dnf group install "C Development Tools and Libraries"
```

---

### 2. Clone & Build

```bash
git clone https://github.com/danny19862025/easy-file.git
cd easy-file
npm install
npx tauri build --no-bundle
```

This compiles the optimized standalone release binary with all frontend assets embedded at `src-tauri/target/release/easy-file`.

---

### 3. Install as a Desktop Application

#### Option A: Arch Linux Native Package (`pacman`) — Recommended on Arch
```bash
cd packaging/arch
makepkg -si
```
* Installs `/usr/bin/easy-file`, desktop launcher (`/usr/share/applications/easy-file.desktop`), and app icon.
* **Uninstall:** `sudo pacman -R easy-file`

#### Option B: User-Local Installer (Works on any Linux distro, no `sudo`)
```bash
./packaging/install.sh
```
* Installs into `~/.local/bin/easy-file`, `~/.local/share/applications/easy-file.desktop`, and `~/.local/share/icons/hicolor/scalable/apps/easy-file.svg`.
* Make sure `~/.local/bin` is in your `PATH` (e.g., `export PATH="$HOME/.local/bin:$PATH"`).
* **Uninstall:** `./packaging/uninstall.sh`

#### Launch
Open **Easy File** from your desktop application launcher, or run:
```bash
easy-file
```

---

## Development Mode

Run with hot-reload for frontend + Rust backend:
```bash
npm install
npm run tauri dev
```

> **Note for Linux Wayland / NVIDIA users:** `easy-file` automatically sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` on startup if unset to prevent WebKitGTK 2.42+ blank-window GPU issues. You can override this by setting `WEBKIT_DISABLE_DMABUF_RENDERER=0` in your environment.

---

## Keyboard Shortcuts

Press `Ctrl+/` or `?` inside the app at any time to view the interactive cheat sheet.

| Category | Shortcut | Action |
| :--- | :--- | :--- |
| **Search & Preview** | `Ctrl+F` or `/` | Instant Fuzzy Search |
| | `Space` | Floating Quick Look Preview |
| **File Operations** | `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / Cut / Paste |
| | `Ctrl+A` | Select all items |
| | `Enter` | Open selected folder or launch file |
| | `F2` | Rename selected item |
| | `Ctrl+Shift+N` / `Ctrl+Alt+N` | New Folder / New File |
| | `Delete` / `Shift+Delete` | Move to Trash / Delete Permanently |
| **Navigation & Tabs** | `Ctrl+L` | Focus & edit path bar |
| | `Alt+←` / `Alt+→` | History Back / Forward |
| | `Alt+↑` or `Backspace` | Go to parent folder |
| | `Ctrl+T` / `Ctrl+W` / `Ctrl+Tab` | New Tab / Close Tab / Cycle Tabs |
| | `F5` or `Ctrl+R` | Refresh current directory |
| **Views & Tools** | `Ctrl+1` – `Ctrl+5` | Grid / List / Details / Miller / Tree |
| | `Ctrl+\` | Toggle Dual-Pane Split View |
| | `Ctrl+B` | Toggle Persistent Drop Zone Shelf |
| | `Ctrl+H` | Toggle hidden files (dotfiles) |
| | `Ctrl+D` | Disk Usage Breakdown |
| | `Ctrl+\`` | Toggle Integrated Terminal |
| | `Ctrl+,` | Open Theme & Icon Pack Switcher |
| | `Ctrl+/` or `?` | Keyboard Shortcuts Cheat Sheet |

---

## Tech Stack

- **Backend:** Rust, Tauri v2, Tokio, `notify`, `jwalk`, `trash`, `sysinfo`, `portable-pty`
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Zustand, `@tanstack/react-virtual`, `xterm.js`, `lucide-react`

## License

MIT
