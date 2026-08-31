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
    raise SystemExit("ERROR: bundled plugin snapshot must currently contain 14 brands")

system = plugin_cfg.get("system", {})
if system.get("rotation_mode") != "sequential":
    raise SystemExit("ERROR: Step 6 must preserve sequential rotation mode")
if system.get("rotation_interval_seconds") != 5:
    raise SystemExit("ERROR: current V9 rotation interval must be 5 seconds")
if system.get("github_sync_interval_seconds") != 300:
    raise SystemExit("ERROR: current GitHub sync interval must be 300 seconds")

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
if "'step'         => 6" not in renderer:
    raise SystemExit("ERROR: renderer must expose Step 6 config contract")
if "render_slot( 'MIDDLE_' . ( $i + 1 ), null, 'middle' )" not in renderer:
    raise SystemExit("ERROR: Step 7 performance patch must lazy-mount middle GIFs")

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
    "syncMiddleVisibility",
    "syncMiddleVisibility: syncMiddleVisibility",
    "requestLayout",
    "fixedHeaderBottom",
    "Keep the previous good banner",
    "0.6.1",
]
for marker in required_js:
    if marker not in js:
        raise SystemExit(f"ERROR: Step 7 performance marker missing: {marker}")

if "window.addEventListener('scroll', fitSideRails" in js:
    raise SystemExit("ERROR: scroll must be rAF-throttled via requestLayout")

config_php = (plugin / "includes" / "class-thmt-banner-config.php").read_text(encoding="utf-8")
required_sync_markers = [
    "REMOTE_CONFIG_URL",
    "wp_remote_get(",
    "get_transient(",
    "set_transient(",
    "get_option(",
    "update_option(",
    "If-None-Match",
    "If-Modified-Since",
    "304 === $code",
    "OPTION_LAST_GOOD",
    "TRANSIENT_LOCK",
    "github_sync_interval_seconds",
    "validate_candidate",
    "wp_schedule_event(",
]
for marker in required_sync_markers:
    if marker not in config_php:
        raise SystemExit(f"ERROR: Step 6 sync/cache marker missing: {marker}")

main_php = (plugin / "thmt-banner-system.php").read_text(encoding="utf-8")
for marker in [
    "THMT_Banner_Config::register()",
    "register_activation_hook",
    "register_deactivation_hook",
    "0.6.1",
]:
    if marker not in main_php:
        raise SystemExit(f"ERROR: bootstrap marker missing: {marker}")

css = (plugin / "assets" / "css" / "frontend.css").read_text(encoding="utf-8")
if "object-fit: contain" not in css:
    raise SystemExit("ERROR: V9 contain rule missing")
if ".thmt-banner-side-rail" not in css:
    raise SystemExit("ERROR: side rail styling missing")
if "backdrop-filter" in css:
    raise SystemExit("ERROR: fixed/sticky backdrop blur reintroduces scroll jank")

print("PASS: Step 7 performance hotfix + Step 6 sync/cache + V9 renderer/rotation contract.")
