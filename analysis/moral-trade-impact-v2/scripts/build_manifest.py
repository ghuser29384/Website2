#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from moral_trade_impact_v2.pipeline import build_manifest


if __name__ == "__main__":
    manifest = build_manifest(ROOT / "outputs", ROOT)
    print(manifest["package_tree_hash"])

