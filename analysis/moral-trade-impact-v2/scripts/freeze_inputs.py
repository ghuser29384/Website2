#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from moral_trade_impact_v2.pipeline import freeze_inputs


if __name__ == "__main__":
    snapshot = freeze_inputs(ROOT / "outputs", ROOT)
    print(snapshot["input_set_hash"])
