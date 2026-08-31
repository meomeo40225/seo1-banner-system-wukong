#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "config" / "banners.json").read_text(encoding="utf-8"))
MANIFEST_PATH = ROOT / "media" / "manifest.json"

if not MANIFEST_PATH.is_file():
    raise SystemExit("ERROR: media/manifest.json missing")

manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
entries = manifest.get("entries", [])

refs = []
for brand in CONFIG["brands"]:
    for role in ("horizontal", "vertical", "middle"):
        refs.append((brand["id"], role, brand["assets"][role]["file"]))

if len(refs) != 42:
    raise SystemExit(f"ERROR: expected 42 source refs, got {len(refs)}")
if len(entries) != 42:
    raise SystemExit(f"ERROR: media manifest must contain 42 entries, got {len(entries)}")

expected = {(brand, role, src) for brand, role, src in refs}
actual = {(e["brand"], e["role"], e["source_gif"]) for e in entries}
if expected != actual:
    raise SystemExit("ERROR: media manifest source set differs from config")

def ffprobe(path: Path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,r_frame_rate",
        "-of", "json", str(path)
    ], text=True)
    return json.loads(out)["streams"][0]

source_total = 0
full_total = 0
small_total = 0
poster_total = 0

for entry in entries:
    source = ROOT / entry["source_gif"]
    full = ROOT / entry["full_mp4"]
    small = ROOT / entry["small_mp4"]
    poster = ROOT / entry["poster_webp"]

    for p in (source, full, small, poster):
        if not p.is_file():
            raise SystemExit(f"ERROR: missing media file {p.relative_to(ROOT)}")

    full_probe = ffprobe(full)
    small_probe = ffprobe(small)

    if full_probe.get("codec_name") != "h264" or small_probe.get("codec_name") != "h264":
        raise SystemExit(f"ERROR: non-H264 output for {entry['source_gif']}")

    for label, probe in (("full", full_probe), ("small", small_probe)):
        rate = probe.get("r_frame_rate", "0/1")
        num, den = [float(x) for x in rate.split("/", 1)]
        fps = num / den if den else 0
        if fps <= 0 or fps > 15.1:
            raise SystemExit(f"ERROR: {label} fps out of policy for {entry['source_gif']}: {fps}")
        if int(probe["width"]) % 2 or int(probe["height"]) % 2:
            raise SystemExit(f"ERROR: H264 dimensions must be even for {entry['source_gif']}")

    if small.stat().st_size > full.stat().st_size * 1.05:
        raise SystemExit(f"ERROR: small variant larger than full for {entry['source_gif']}")

    source_total += source.stat().st_size
    full_total += full.stat().st_size
    small_total += small.stat().st_size
    poster_total += poster.stat().st_size

if full_total >= source_total * 0.25:
    raise SystemExit("ERROR: full H264 set did not reduce GIF bytes by at least 75%")
if small_total >= source_total * 0.18:
    raise SystemExit("ERROR: small H264 set did not reduce GIF bytes by at least 82%")
if poster_total >= source_total * 0.02:
    raise SystemExit("ERROR: poster set is unexpectedly large")

print(
    "PASS: 42 H264 full + 42 small + 42 WebP posters | "
    f"GIF={source_total/1048576:.2f}MB "
    f"full={full_total/1048576:.2f}MB "
    f"small={small_total/1048576:.2f}MB "
    f"posters={poster_total/1048576:.2f}MB"
)
