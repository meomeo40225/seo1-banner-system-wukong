#!/usr/bin/env bash
set -euo pipefail

ZIP_PATH="${1:-$HOME/Downloads/thmt-banner-system-github-ready.zip}"
REPO_URL="https://github.com/meomeo40225/seo1-banner-system-wukong.git"
BRANCH="step3-assets"
WORKDIR="${TMPDIR:-/tmp}/seo1-banner-step3"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "ERROR: ZIP not found: $ZIP_PATH" >&2
  echo "Usage: bash step3_import_assets.sh /path/to/thmt-banner-system-github-ready.zip" >&2
  exit 1
fi

rm -rf "$WORKDIR"
git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$WORKDIR"
cd "$WORKDIR"

TMP_EXTRACT="$(mktemp -d)"
trap 'rm -rf "$TMP_EXTRACT"' EXIT
unzip -q "$ZIP_PATH" -d "$TMP_EXTRACT"
SOURCE="$TMP_EXTRACT/thmt-banner-system/assets"

if [[ ! -d "$SOURCE" ]]; then
  echo "ERROR: expected assets folder missing in ZIP" >&2
  exit 1
fi

rm -rf assets/tot assets/topclub assets/va assets/big-win assets/db assets/nbet assets/ox assets/one88 assets/fb assets/11bet assets/lucky assets/ld assets/388bet assets/fa
mkdir -p assets
cp -R "$SOURCE"/* assets/

python3 -m pip install --user jsonschema >/dev/null 2>&1 || true
python3 scripts/validate_config.py

git add assets
if git diff --cached --quiet; then
  echo "No asset changes to commit."
else
  git commit -m "Step 3: add verified 42 banner GIF assets"
  git push origin "$BRANCH"
fi

echo "STEP3_UPLOAD_OK"
