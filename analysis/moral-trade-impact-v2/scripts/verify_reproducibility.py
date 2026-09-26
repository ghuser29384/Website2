#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from moral_trade_impact_v2.io_utils import file_hashes, tree_hash, write_json
from moral_trade_impact_v2.pipeline import build_manifest, run_pipeline


EXCLUDED = {"fast_gate.json", "independent_validation.json", "reproducibility_manifest.json", "reproducibility_check.json"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Regenerate intended outputs and compare bytes")
    parser.add_argument("--draws", type=int, default=200_000)
    parser.add_argument("--reference-dir", type=Path, default=ROOT / "outputs")
    args = parser.parse_args()
    reference = args.reference_dir if args.reference_dir.is_absolute() else ROOT / args.reference_dir
    with tempfile.TemporaryDirectory(prefix="moral-trade-impact-v2-repro-") as directory:
        candidate = Path(directory) / "outputs"
        run_pipeline(candidate, args.draws, True, ROOT)
        reference_hashes = file_hashes(reference, exclude_names=EXCLUDED)
        candidate_hashes = file_hashes(candidate, exclude_names=EXCLUDED)
        missing = sorted(set(reference_hashes) - set(candidate_hashes))
        extra = sorted(set(candidate_hashes) - set(reference_hashes))
        mismatched = sorted(path for path in set(reference_hashes).intersection(candidate_hashes) if reference_hashes[path] != candidate_hashes[path])
        if missing or extra or mismatched:
            raise AssertionError({"missing": missing, "extra": extra, "mismatched": mismatched})
        report = {
            "schema_version": 1,
            "status": "byte_stable",
            "draws_per_scenario_and_basis": args.draws,
            "compared_file_count": len(reference_hashes),
            "reference_tree_hash": tree_hash(reference_hashes),
            "candidate_tree_hash": tree_hash(candidate_hashes),
            "excluded_self_or_post_validation_files": sorted(EXCLUDED),
            "warning": "Byte stability proves reproducibility of the synthetic computation, not empirical validity.",
        }
    write_json(reference / "reproducibility_check.json", report)
    build_manifest(reference, ROOT)
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
