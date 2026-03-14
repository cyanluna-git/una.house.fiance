#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$APP_DIR"
pnpm install --frozen-lockfile
pnpm build
systemctl --user restart unahouse-finance
tailscale ip -4 | sed -n '1p'
