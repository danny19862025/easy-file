#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BIN_SRC="${PROJECT_DIR}/src-tauri/target/release/easy-file"

if [[ ! -x "${BIN_SRC}" ]]; then
  echo "Building Easy File standalone release binary..."
  (cd "${PROJECT_DIR}" && npx tauri build --no-bundle)
fi

mkdir -p "${HOME}/.local/bin" \
         "${HOME}/.local/share/applications" \
         "${HOME}/.local/share/icons/hicolor/scalable/apps"

install -m 755 "${BIN_SRC}" "${HOME}/.local/bin/easy-file"
install -m 644 "${SCRIPT_DIR}/easy-file.svg" "${HOME}/.local/share/icons/hicolor/scalable/apps/easy-file.svg"

sed "s|Exec=.*|Exec=${HOME}/.local/bin/easy-file %U|" \
  "${SCRIPT_DIR}/easy-file.desktop" > "${HOME}/.local/share/applications/easy-file.desktop"
chmod 644 "${HOME}/.local/share/applications/easy-file.desktop"

update-desktop-database "${HOME}/.local/share/applications" 2>/dev/null || true
gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" 2>/dev/null || true

echo "Easy File installed successfully!"
echo "Launch from your application menu or run: easy-file"
