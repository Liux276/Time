#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/sync-client-dist.sh <linux-user> <domain> [project-root]

Examples:
  bash scripts/sync-client-dist.sh ubuntu hk.xliudy.site
  bash scripts/sync-client-dist.sh deploy example.com /home/deploy/Time
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
  exit 1
fi

linux_user="$1"
domain="$2"
project_root="${3:-/home/${linux_user}/Time}"

src_dir="${project_root}/packages/client/dist/"
dst_dir="/var/www/${domain}"

if ! command -v rsync >/dev/null 2>&1; then
  echo "Error: rsync is required but not installed." >&2
  exit 1
fi

if [[ ! -f "${src_dir}index.html" ]]; then
  echo "Error: ${src_dir}index.html not found. Build frontend first (pnpm build)." >&2
  exit 1
fi

echo "Syncing static files:"
echo "  source: ${src_dir}"
echo "  target: ${dst_dir}"

sudo mkdir -p "${dst_dir}"
sudo rsync -a --delete "${src_dir}" "${dst_dir}/"
sudo chown -R root:root "${dst_dir}"
sudo find "${dst_dir}" -type d -exec chmod 755 {} +
sudo find "${dst_dir}" -type f -exec chmod 644 {} +

echo "Done."
echo "You can now set Caddy root to: ${dst_dir}"
