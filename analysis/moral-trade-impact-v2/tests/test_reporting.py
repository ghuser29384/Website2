from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import numpy as np

from moral_trade_impact_v2.io_utils import write_csv, write_json
from moral_trade_impact_v2.reporting import summary_statistics


class ReportingTests(unittest.TestCase):
    def test_summary_labels_mean_and_median_correctly(self) -> None:
        stats = summary_statistics(np.asarray([0.0, 1.0, 2.0, 100.0]), negligible_threshold=1.0)
        self.assertEqual(stats["mean"], 25.75)
        self.assertEqual(stats["median"], 1.5)
        self.assertNotEqual(stats["mean"], stats["median"])
        self.assertEqual(stats["probability_zero"], 0.25)
        self.assertEqual(stats["probability_negligible"], 0.5)

    def test_stable_writers_are_byte_identical(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rows = [{"a": 1, "b": 0.123456789012345}]
            write_csv(root / "one.csv", rows, ["a", "b"])
            write_csv(root / "two.csv", rows, ["a", "b"])
            self.assertEqual((root / "one.csv").read_bytes(), (root / "two.csv").read_bytes())
            write_json(root / "one.json", {"b": 2, "a": [1, 2]})
            write_json(root / "two.json", {"a": [1, 2], "b": 2})
            self.assertEqual((root / "one.json").read_bytes(), (root / "two.json").read_bytes())


if __name__ == "__main__":
    unittest.main()

