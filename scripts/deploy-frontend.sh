#!/bin/sh
# Copies the committed website build (deploy/public_html) into the live web root on cPanel.
#
#   sh scripts/deploy-frontend.sh [WEB_ROOT]
#   WEB_ROOT defaults to $HOME/shehraz-barbar.digitalmarketingshub.com/public_html
#
# - Never overwrites the live config.js (API URLs) or .htaccess. On a first install they are
#   created from the build; afterwards a differing .htaccess is only reported.
# - Backs up the files it is about to replace to ~/backups/ (see rollback-frontend.sh).
# - Copies hashed assets and media first and switches index.html last, so visitors never get an
#   index.html that points at a bundle that is not there yet.
# - Removes only old files inside assets/ that the new build no longer uses. Nothing else in the
#   web root is touched. Needs no Node.js or npm.
set -eu

REPO=$(cd "$(dirname "$0")/.." && pwd)
SRC="$REPO/deploy/public_html"
DEST=${1:-"$HOME/shehraz-barbar.digitalmarketingshub.com/public_html"}
BACKUP_DIR="$HOME/backups"
STAMP=$(date +%Y%m%d-%H%M%S)

fail() { echo "ERROR: $*" >&2; exit 1; }

[ -f "$SRC/index.html" ] || fail "$SRC/index.html not found. Run 'npm run deploy:build' locally, commit deploy/ and pull."
[ -d "$DEST" ] || fail "web root $DEST does not exist."

# 1. Check the build is complete before touching anything live.
REFS=$(grep -o '"/assets/[^"]*"' "$SRC/index.html" | tr -d '"' | sed 's|^/||')
[ -n "$REFS" ] || fail "index.html references no /assets/ files."
for r in $REFS; do [ -f "$SRC/$r" ] || fail "build is incomplete: $r is missing."; done
MEDIA_COUNT=$(find "$SRC/media" -type f \( -name '*.jpg' -o -name '*.mp4' \) | wc -l | tr -d ' ')
echo "Build OK: $(echo "$REFS" | tr '\n' ' ')+ $MEDIA_COUNT media files"
[ -f "$SRC/version.json" ] && echo "Build info: $(tr -d '\n ' < "$SRC/version.json")"

# 2. Back up what this deploy replaces.
mkdir -p "$BACKUP_DIR"
BACKUP="$BACKUP_DIR/shehraz-frontend-$STAMP.tar.gz"
EXISTING=$(cd "$DEST" && ls -A | grep -E '^(index\.html|assets|media|logo\.png|config\.js|\.htaccess|version\.json)$' || true)
if [ -n "$EXISTING" ]; then
  ( cd "$DEST" && tar -czf - $EXISTING ) > "$BACKUP"
  echo "Backup: $BACKUP"
else
  BACKUP=""
  echo "Nothing to back up (first install)."
fi

# 3. New assets and media first (hashed names, so nothing in use is overwritten).
mkdir -p "$DEST/assets" "$DEST/media"
cp -R "$SRC/assets/." "$DEST/assets/"
cp -R "$SRC/media/." "$DEST/media/"
cp "$SRC/logo.png" "$DEST/logo.png"
[ -f "$SRC/version.json" ] && cp "$SRC/version.json" "$DEST/version.json"

# 4. Per-server files: create on first install, never overwrite.
if [ ! -f "$DEST/config.js" ]; then
  cp "$SRC/config.example.js" "$DEST/config.js"
  echo "NOTE: created config.js from the template. Edit it to point at the API, e.g."
  echo "      apiBaseUrl: 'https://api.<domain>/api', socketUrl: 'https://api.<domain>'"
else
  echo "Kept live config.js"
fi
if [ ! -f "$DEST/.htaccess" ]; then
  cp "$SRC/.htaccess" "$DEST/.htaccess"
  echo "Installed .htaccess"
elif ! cmp -s "$SRC/.htaccess" "$DEST/.htaccess"; then
  echo "Kept live .htaccess (it differs from the build's; compare with: diff $SRC/.htaccess $DEST/.htaccess)"
fi

# 5. Switch index.html atomically.
cp "$SRC/index.html" "$DEST/.index.html.new"
mv -f "$DEST/.index.html.new" "$DEST/index.html"

# 6. Remove assets the new index.html no longer references.
for f in "$DEST"/assets/*; do
  [ -f "$f" ] || continue
  name="assets/$(basename "$f")"
  echo "$REFS" | grep -qx "$name" || { rm -f "$f"; echo "Removed stale $name"; }
done

echo "Deployed to $DEST"
[ -n "$BACKUP" ] && echo "Rollback: sh $REPO/scripts/rollback-frontend.sh $BACKUP"
exit 0
