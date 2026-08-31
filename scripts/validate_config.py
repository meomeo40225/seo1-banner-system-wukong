#!/usr/bin/env python3
import json
from pathlib import Path
from jsonschema import Draft202012Validator

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "config" / "banners.json").read_text(encoding="utf-8"))
schema = json.loads((root / "config" / "banners.schema.json").read_text(encoding="utf-8"))

errors = sorted(Draft202012Validator(schema).iter_errors(config), key=lambda e: list(e.path))
if errors:
    for e in errors:
        print("ERROR:", "/".join(map(str, e.path)), e.message)
    raise SystemExit(1)

if len(config.get("brands", [])) != 14:
    raise SystemExit(f"ERROR: expected 14 brands, got {len(config.get('brands', []))}")

print("PASS: schema valid and 14 brands configured.")
