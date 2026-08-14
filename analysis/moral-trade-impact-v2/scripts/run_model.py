#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from moral_trade_impact_v2.pipeline import run_pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the frozen Moral Trade Impact Model v2")
    parser.add_argument("--draws", type=int, default=200_000)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "outputs")
    parser.add_argument("--freeze-first-run", action="store_true")
    args = parser.parse_args()
    if args.draws < 100:
        raise SystemExit("draws must be at least 100")
    output_dir = args.output_dir if args.output_dir.is_absolute() else ROOT / args.output_dir
    run_pipeline(output_dir, args.draws, args.freeze_first_run, ROOT)
    print(output_dir)


if __name__ == "__main__":
    main()

