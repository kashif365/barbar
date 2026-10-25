#!/bin/sh
# Restores the website files saved by deploy-frontend.sh.
#
#   sh scripts/rollback-frontend.sh ~/backups/shehraz-frontend-YYYYMMDD-HHMMSS.tar.gz [WEB_ROOT]
#
# Only the files that were in the backup are restored (index.html, assets/, media/, logo.png,
# config.js, .htaccess). assets/ is replaced so it matches the restored index.html exactly.
set -eu

BACKUP=${1:-}
DEST=${2:-"$HOME/shehraz-barbar.digitalmarketingshub.com/public_html"}

[ -n "$BACKUP" ] && [ -f "$BACKUP" ] || { echo "Usage: sh $0 <backup.tar.gz> [WEB_ROOT]"; ls -1t "$HOME/backups"/shehraz-frontend-*.tar.gz 2>/dev/null | head -5; exit 1; }
[ -d "$DEST" ] || { echo "ERROR: web root $DEST does not exist." >&2; exit 1; }

if tar -tzf - < "$BACKUP" | grep -q '^assets/'; then
  rm -rf "$DEST/assets"
fi
tar -xzf - -C "$DEST" < "$BACKUP"
echo "Restored $BACKUP into $DEST"
