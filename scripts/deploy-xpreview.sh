#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SSH_HOST="${PDF_EDIT_SSH_HOST:-xs360830@xs360830.xsrv.jp}"
SSH_PORT="${PDF_EDIT_SSH_PORT:-10022}"
SSH_KEY="${PDF_EDIT_SSH_KEY:-/Users/nobu/.ssh/id_ed25519}"
REMOTE_DIR="${PDF_EDIT_REMOTE_DIR:-/home/xs360830/iruagaru.com/public_html/xpreview/pdf-edit/}"

cd "$PROJECT_DIR"
npm test
npm run lint

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$SSH_HOST" "mkdir -p '$REMOTE_DIR'"
rsync -azv --delete \
  --exclude '.DS_Store' \
  -e "ssh -i $SSH_KEY -p $SSH_PORT" \
  "$PROJECT_DIR/out/" \
  "$SSH_HOST:$REMOTE_DIR"

echo "Published to https://xpreview.iruagaru.com/pdf-edit/"
