#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
plugin = root / "plugin" / "thmt-banner-system"

required = [
    plugin / "thmt-banner-system.php",
    plugin / "includes" / "class-thmt-banner-config.php",
    plugin / "includes" / "class-thmt-banner-renderer.php",
    plugin / "assets" / "css" / "frontend.css",
    plugin / "assets" / "js" / "rotation-core.js",
    plugin / "assets" / "js" / "frontend.js",
    plugin / "config" / "banners.json",
    plugin / "readme.txt",
]
missing = [str(p.relative_to(root)) for p in required if not p.is_file()]
if missing:
    raise SystemExit(f"ERROR: missing plugin files: {missing}")

root_cfg = json.loads((root / "config" / "banners.json").read_text(encoding="utf-8"))
plugin_cfg = json.loads((plugin / "config" / "banners.json").read_text(encoding="utf-8"))
if root_cfg != plugin_cfg:
    raise SystemExit("ERROR: plugin config snapshot differs from root config/banners.json")

if plugin_cfg.get("layout", {}).get("baseline") != "V9_LOCKED":
    raise SystemExit("ERROR: plugin snapshot baseline is not V9_LOCKED")
if len(plugin_cfg.get("brands", [])) != 14:
    raise SystemExit("ERROR: plugin snapshot must contain 14 brands")

system = plugin_cfg.get("system", {})
if system.get("rotation_mode") != "sequential":
    raise SystemExit("ERROR: Step 5 requires sequential rotation mode")
if system.get("rotation_interval_seconds") != 5:
    raise SystemExit("ERROR: V9 rotation interval must currently be 5 seconds")

layout = plugin_cfg["layout"]
expected_counts = {"top": 2, "left": 2, "right": 2, "middle": 5, "bottom": 2}
for key, expected in expected_counts.items():
    actual = layout.get(key, {}).get("visible_count")
    if actual != expected:
        raise SystemExit(f"ERROR: {key} visible_count expected {expected}, got {actual}")

renderer = (plugin / "includes" / "class-thmt-banner-renderer.php").read_text(encoding="utf-8")
for slot in [
    "TOP_1", "TOP_2", "LEFT_1", "LEFT_2", "RIGHT_1", "RIGHT_2",
    "BOTTOM_1", "BOTTOM_2", "MIDDLE_"
]:
    if slot not in renderer:
        raise SystemExit(f"ERROR: renderer missing slot marker {slot}")
if "thmt-banner-rotation-core" not in renderer:
    raise SystemExit("ERROR: rotation core is not enqueued before frontend.js")

js = (plugin / "assets" / "js" / "frontend.js").read_text(encoding="utf-8")
required_js = [
    "window.THMTBannerRuntime",
    "renderTick",
    "startRotation",
    "stopRotation",
    "window.setInterval",
    "rotation_interval_seconds",
    "link.href = item.url",
    "img.src = item.image",
]
for marker in required_js:
    if marker not in js:
        raise SystemExit(f"ERROR: Step 5 frontend marker missing: {marker}")

all_php = "\n".join(p.read_text(encoding="utf-8") for p in plugin.rglob("*.php"))
if "wp_remote_get(" in all_php or "wp_remote_request(" in all_php:
    raise SystemExit("ERROR: Step 5 must not implement remote GitHub sync/cache")

css = (plugin / "assets" / "css" / "frontend.css").read_text(encoding="utf-8")
if "object-fit: contain" not in css:
    raise SystemExit("ERROR: V9 contain rule missing")
if ".thmt-banner-side-rail" not in css:
    raise SystemExit("ERROR: side rail styling missing")

print("PASS: Step 5 plugin + V9 layout + sequential scheduler + no Step6 leakage.")
