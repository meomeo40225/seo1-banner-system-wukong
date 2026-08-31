#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugin" / "thmt-banner-system"

required = [
    PLUGIN / "thmt-banner-system.php",
    PLUGIN / "includes" / "class-thmt-banner-config.php",
    PLUGIN / "includes" / "class-thmt-banner-renderer.php",
    PLUGIN / "assets" / "css" / "frontend.css",
    PLUGIN / "assets" / "js" / "rotation-core.js",
    PLUGIN / "assets" / "js" / "frontend.js",
    PLUGIN / "config" / "banners.json",
    PLUGIN / "readme.txt",
    ROOT / "media" / "manifest.json",
]
missing = [str(p.relative_to(ROOT)) for p in required if not p.is_file()]
if missing:
    raise SystemExit(f"ERROR: missing files: {missing}")

root_cfg = json.loads((ROOT / "config" / "banners.json").read_text(encoding="utf-8"))
plugin_cfg = json.loads((PLUGIN / "config" / "banners.json").read_text(encoding="utf-8"))
if root_cfg != plugin_cfg:
    raise SystemExit("ERROR: plugin config snapshot differs from root config/banners.json")

if root_cfg.get("layout", {}).get("baseline") != "V9_LOCKED":
    raise SystemExit("ERROR: V9 baseline drift")
if len(root_cfg.get("brands", [])) != 14:
    raise SystemExit("ERROR: current bundled snapshot must contain 14 brands")
if root_cfg.get("system", {}).get("rotation_interval_seconds") != 5:
    raise SystemExit("ERROR: rotation interval drift")
if root_cfg.get("system", {}).get("github_sync_interval_seconds") != 300:
    raise SystemExit("ERROR: sync interval drift")

main_php = (PLUGIN / "thmt-banner-system.php").read_text(encoding="utf-8")
for marker in ["1.0.1", "THMT_Banner_Config::register()", "register_activation_hook", "register_deactivation_hook"]:
    if marker not in main_php:
        raise SystemExit(f"ERROR: bootstrap marker missing: {marker}")

config_php = (PLUGIN / "includes" / "class-thmt-banner-config.php").read_text(encoding="utf-8")
for marker in [
    "REFRESH_HOOK",
    "schedule_background_refresh",
    "wp_schedule_single_event",
    "wp_remote_get(",
    "media_base_url",
    "performance_profile_override",
    "OPTION_LAST_GOOD",
    "If-None-Match",
    "If-Modified-Since",
]:
    if marker not in config_php:
        raise SystemExit(f"ERROR: config marker missing: {marker}")

get_start = config_php.find("public static function get()")
get_end = config_php.find("public static function schedule_background_refresh", get_start)
if get_start < 0 or get_end < 0:
    raise SystemExit("ERROR: could not inspect get()")
if "wp_remote_get(" in config_php[get_start:get_end] or "refresh_remote(" in config_php[get_start:get_end]:
    raise SystemExit("ERROR: frontend get() must not block on remote HTTP")

renderer = (PLUGIN / "includes" / "class-thmt-banner-renderer.php").read_text(encoding="utf-8")
for slot in ["LEFT_1", "LEFT_2", "RIGHT_1", "RIGHT_2", "BOTTOM_1", "BOTTOM_2", "MIDDLE_"]:
    if slot not in renderer:
        raise SystemExit(f"ERROR: renderer missing {slot}")
if "TOP_1" in renderer or "TOP_2" in renderer or "thmt-banner-top" in renderer:
    raise SystemExit("ERROR: Stable V1 must not render TOP slots")
if "data-kind" not in renderer:
    raise SystemExit("ERROR: renderer must emit media-free slot geometry")
if "<img" in renderer or "<video" in renderer:
    raise SystemExit("ERROR: PHP renderer must not eagerly mount banner media")

js = (PLUGIN / "assets" / "js" / "frontend.js").read_text(encoding="utf-8")
for marker in [
    "mediaBaseUrl",
    "video/mp4",
    "-poster.webp",
    "-sm.mp4",
    "IntersectionObserver",
    "ResizeObserver",
    "MutationObserver",
    "requestIdleCallback",
    "visibilitychange",
    "isScrolling",
    "pauseVideos",
    "resumeVideos",
    "desktopMql",
    "gif-fallback",
    "1.0.1",
]:
    if marker not in js:
        raise SystemExit(f"ERROR: performance engine marker missing: {marker}")

if "renderSlot('TOP_1'" in js or "renderSlot('TOP_2'" in js:
    raise SystemExit("ERROR: Stable V1 JS must not render TOP media")

if "window.addEventListener('scroll', scheduleGeometry" in js or "window.addEventListener('scroll', recomputeGeometry" in js:
    raise SystemExit("ERROR: scroll path must not perform geometry calculation")

css = (PLUGIN / "assets" / "css" / "frontend.css").read_text(encoding="utf-8")
if "object-fit: contain" not in css:
    raise SystemExit("ERROR: contain rule missing")
if "backdrop-filter" in css:
    raise SystemExit("ERROR: backdrop-filter reintroduces fixed-layer jank")
if "@media (max-width: 1200px)" not in css:
    raise SystemExit("ERROR: mobile side rail policy missing")

if "https://seo1-banner-system-wukong.pages.dev/config/banners.json" not in config_php:\n    raise SystemExit("ERROR: remote config origin is not Cloudflare Pages")\nif config_php.count("https://seo1-banner-system-wukong.pages.dev/") < 3:\n    raise SystemExit("ERROR: config/assets/media must all use Cloudflare Pages")\nif "nofollow sponsored noopener noreferrer" not in js:\n    raise SystemExit("ERROR: banner outbound rel policy missing")\n\nprint("PASS: Candidate 1.0.1 + Cloudflare Pages delivery + no-TOP performance engine + SWR config.")
