#!/usr/bin/env python3
import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "banners.json"
MEDIA_ROOT = ROOT / "media"
FPS = 15
CRF = 28

ROLE_SMALL_WIDTH = {
    "horizontal": 480,
    "vertical": 150,
    "middle": 320,
}

def run(cmd):
    subprocess.run(cmd, check=True)

def probe(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,codec_name",
        "-of", "json", str(path)
    ], text=True)
    stream = json.loads(out)["streams"][0]
    return {
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "fps": stream.get("r_frame_rate", ""),
        "codec": stream.get("codec_name", ""),
    }

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def even_scale_filter(max_width=None):
    if max_width is None:
        return f"fps={FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2"
    return (
        f"fps={FPS},"
        f"scale='min(iw,{max_width})':'-2':flags=lanczos,"
        "scale=trunc(iw/2)*2:trunc(ih/2)*2"
    )

def poster_filter(max_width):
    return (
        f"scale='min(iw,{max_width})':'-2':flags=lanczos,"
        "scale=trunc(iw/2)*2:trunc(ih/2)*2"
    )

def convert_video(src, dest, max_width=None):
    dest.parent.mkdir(parents=True, exist_ok=True)
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(src),
        "-an",
        "-vf", even_scale_filter(max_width),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", str(CRF),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(dest),
    ])

def make_poster(src, dest, max_width):
    dest.parent.mkdir(parents=True, exist_ok=True)
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(src),
        "-frames:v", "1",
        "-vf", poster_filter(max_width),
        "-c:v", "libwebp",
        "-quality", "72",
        "-compression_level", "4",
        str(dest),
    ])

def main():
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    entries = []
    wanted = set()

    for brand in config["brands"]:
        brand_id = brand["id"]
        for role in ("horizontal", "vertical", "middle"):
            source_rel = brand["assets"][role]["file"]
            src = ROOT / source_rel
            if not src.is_file():
                raise SystemExit(f"Missing source GIF: {source_rel}")

            stem = src.stem
            out_dir = MEDIA_ROOT / brand_id
            full = out_dir / f"{stem}.mp4"
            small = out_dir / f"{stem}-sm.mp4"
            poster = out_dir / f"{stem}-poster.webp"

            convert_video(src, full)
            convert_video(src, small, ROLE_SMALL_WIDTH[role])
            make_poster(src, poster, ROLE_SMALL_WIDTH[role])

            for p in (full, small, poster):
                wanted.add(p.resolve())

            src_probe = probe(src)
            full_probe = probe(full)
            small_probe = probe(small)

            entries.append({
                "brand": brand_id,
                "role": role,
                "source_gif": source_rel,
                "source_bytes": src.stat().st_size,
                "source_width": src_probe["width"],
                "source_height": src_probe["height"],
                "full_mp4": str(full.relative_to(ROOT)).replace(os.sep, "/"),
                "full_bytes": full.stat().st_size,
                "full_width": full_probe["width"],
                "full_height": full_probe["height"],
                "full_sha256": sha256(full),
                "small_mp4": str(small.relative_to(ROOT)).replace(os.sep, "/"),
                "small_bytes": small.stat().st_size,
                "small_width": small_probe["width"],
                "small_height": small_probe["height"],
                "small_sha256": sha256(small),
                "poster_webp": str(poster.relative_to(ROOT)).replace(os.sep, "/"),
                "poster_bytes": poster.stat().st_size,
                "poster_sha256": sha256(poster),
                "fps": FPS,
                "codec": full_probe["codec"],
            })

    if MEDIA_ROOT.exists():
        for p in MEDIA_ROOT.rglob("*"):
            if p.is_file() and p.name != "manifest.json" and p.resolve() not in wanted:
                p.unlink()

    manifest = {
        "version": 1,
        "generated_from_config_version": config.get("config_version", ""),
        "fps": FPS,
        "codec": "h264",
        "entries": entries,
        "totals": {
            "source_gif_bytes": sum(e["source_bytes"] for e in entries),
            "full_mp4_bytes": sum(e["full_bytes"] for e in entries),
            "small_mp4_bytes": sum(e["small_bytes"] for e in entries),
            "poster_bytes": sum(e["poster_bytes"] for e in entries),
        },
    }
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    (MEDIA_ROOT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    src_mb = manifest["totals"]["source_gif_bytes"] / 1048576
    full_mb = manifest["totals"]["full_mp4_bytes"] / 1048576
    small_mb = manifest["totals"]["small_mp4_bytes"] / 1048576
    poster_mb = manifest["totals"]["poster_bytes"] / 1048576
    print(f"MEDIA_OK 42 assets | GIF={src_mb:.2f}MB fullMP4={full_mb:.2f}MB smallMP4={small_mb:.2f}MB posters={poster_mb:.2f}MB")

if __name__ == "__main__":
    main()
