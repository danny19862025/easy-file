#!/usr/bin/env bash
set -euo pipefail

rm -f "${HOME}/.local/bin/easy-file"
rm -f "${HOME}/.local/share/applications/easy-file.desktop"
rm -f "${HOME}/.local/share/icons/hicolor/scalable/apps/easy-file.svg"

update-desktop-database "${HOME}/.local/share/applications" 2>/dev/null || true
echo "Easy File uninstalled from ~/.local"
