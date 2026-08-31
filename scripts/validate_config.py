#!/usr/bin/env python3
import hashlib
import json
import struct
from pathlib import Path
from jsonschema import Draft202012Validator

root = Path(__file__).resolve().parents[1]
config_path = root / "config" / "banners.json"
schema_path = root / "config" / "banners.schema.json"
inventory_path = root / "assets" / "inventory.json"

config = json.loads(config_path.read_text(encoding="utf-8"))
schema = json.loads(schema_path.read_text(encoding="utf-8"))

errors = sorted(Draft202012Validator(schema).iter_errors(config), key=lambda e: list(e.path))
if errors:
    for e in errors:
        print("ERROR:", "/".join(map(str, e.path)), e.message)
    raise SystemExit(1)

brands = config.get("brands", [])
if len(brands) != 14:
    raise SystemExit(f"ERROR: expected 14 brands, got {len(brands)}")

brand_ids = [b.get("id") for b in brands]
if len(set(brand_ids)) != len(brand_ids):
    raise SystemExit("ERROR: duplicate brand id detected")

refs = []
for brand in brands:
    assets = brand.get("assets", {})
    if set(assets) != {"horizontal", "vertical", "middle"}:
        raise SystemExit(f"ERROR: brand {brand['id']} must define horizontal, vertical, middle")
    for kind in ("horizontal", "vertical", "middle"):
        asset = assets[kind]
        rel = asset["file"]
        if not rel.startswith(f"assets/{brand['id']}/") or not rel.lower().endswith(".gif"):
            raise SystemExit(f"ERROR: unsafe/mismatched asset path: {rel}")
        refs.append((brand["id"], kind, asset))

if len(refs) != 42:
    raise SystemExit(f"ERROR: expected 42 asset references, got {len(refs)}")

ref_paths = [a[2]["file"] for a in refs]
if len(set(ref_paths)) != 42:
    raise SystemExit("ERROR: duplicate asset file reference detected")

if not inventory_path.is_file():
    raise SystemExit("ERROR: missing assets/inventory.json")

inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
if inventory.get("count") != 42:
    raise SystemExit(f"ERROR: inventory count must be 42, got {inventory.get('count')}")
inv_by_file = {x["file"]: x for x in inventory.get("assets", [])}
if set(inv_by_file) != set(ref_paths):
    missing = sorted(set(ref_paths) - set(inv_by_file))
    extra = sorted(set(inv_by_file) - set(ref_paths))
    raise SystemExit(f"ERROR: inventory/config mismatch; missing={missing}, extra={extra}")

for brand_id, kind, asset in refs:
    rel = asset["file"]
    path = root / rel
    if not path.is_file():
        raise SystemExit(f"ERROR: missing asset: {rel}")

    data = path.read_bytes()
    if len(data) < 10 or data[:6] not in (b"GIF87a", b"GIF89a"):
        raise SystemExit(f"ERROR: invalid GIF file: {rel}")

    width, height = struct.unpack("<HH", data[6:10])
    actual_size = f"{width}x{height}"
    if actual_size != asset["size"]:
        raise SystemExit(f"ERROR: size mismatch for {rel}: config={asset['size']} actual={actual_size}")

    inv = inv_by_file[rel]
    if inv.get("brand") != brand_id:
        raise SystemExit(f"ERROR: inventory brand mismatch for {rel}")
    if inv.get("declared_size") != asset["size"]:
        raise SystemExit(f"ERROR: inventory size mismatch for {rel}")
    if inv.get("bytes") != len(data):
        raise SystemExit(f"ERROR: byte-size mismatch for {rel}")

    digest = hashlib.sha256(data).hexdigest()
    if inv.get("sha256") != digest:
        raise SystemExit(f"ERROR: SHA256 mismatch for {rel}")

actual_gifs = {
    str(p.relative_to(root)).replace("\\", "/")
    for p in (root / "assets").rglob("*.gif")
}
if actual_gifs != set(ref_paths):
    missing = sorted(set(ref_paths) - actual_gifs)
    extra = sorted(actual_gifs - set(ref_paths))
    raise SystemExit(f"ERROR: GIF set mismatch; missing={missing}, extra={extra}")

print("PASS: schema + 14 brands + 42 GIFs + dimensions + inventory + SHA256 all valid.")
