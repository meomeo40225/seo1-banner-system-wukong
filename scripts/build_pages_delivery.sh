#!/usr/bin/env bash
set -euo pipefail

OUT="public-delivery"
rm -rf "$OUT"
mkdir -p "$OUT/config"

cp config/banners.json "$OUT/config/banners.json"
cp -R media "$OUT/media"
cp -R assets "$OUT/assets"

cat > "$OUT/_headers" <<'EOF'
/config/banners.json
  Cache-Control: public, max-age=60, must-revalidate
  Access-Control-Allow-Origin: *

/media/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/assets/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *
EOF

echo "Built Cloudflare Pages delivery payload:"
find "$OUT" -type f | wc -l
du -sh "$OUT"
