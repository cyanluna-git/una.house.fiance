#!/usr/bin/env bash
set -euo pipefail

TAILSCALE_IP="$(tailscale ip -4 | sed -n '1p')"

if [ -z "$TAILSCALE_IP" ]; then
  echo "No Tailscale IPv4 address found" >&2
  exit 1
fi

cd /home/cyanluna-jarvis/cyanluna.dev/unahouse.finance
exec /usr/bin/pnpm exec next start -p 3104 -H "$TAILSCALE_IP"
