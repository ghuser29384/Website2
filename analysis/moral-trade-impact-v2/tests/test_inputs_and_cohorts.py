from __future__ import annotations

import math
import unittest

from moral_trade_impact_v2.cohort import build_cohort_rows
from moral_trade_impact_v2.config import PACKAGE_ROOT, load_archetypes, load_parameters, validate_inputs


class InputAndCohortTests(unittest.TestCase):
    def test_frozen_inputs_reconcile(self) -> None:
        validate_inputs(PACKAGE_ROOT)

    def test_monthly_cohorts_hit_every_eoy_milestone(self) -> None:
        parameters = load_parameters()
        targets = [parameters[f"eoy{year}_active"].central for year in range(1, 6)]
        rows = build_cohort_rows(load_archetypes(), targets)
        for year, expected in enumerate(targets, start=1):
            row = rows[year * 12 - 1]
            self.assertEqual(row["target_active"], expected)
            self.assertTrue(math.isclose(row["ea_active"], expected * 0.40, abs_tol=1e-8))
            self.assertTrue(math.isclose(row["non_ea_active"], expected * 0.60, abs_tol=1e-8))
            self.assertTrue(math.isclose(row["support_only_active"], expected * 0.15, abs_tol=1e-8))
            self.assertTrue(math.isclose(row["transaction_active"], expected * 0.85, abs_tol=1e-8))

    def test_acquisition_is_inferred_after_retention(self) -> None:
        parameters = load_parameters()
        targets = [parameters[f"eoy{year}_active"].central for year in range(1, 6)]
        rows = build_cohort_rows(load_archetypes(), targets)
        self.assertGreater(rows[12]["activation_prospects"], rows[12]["new_active"])
        self.assertGreater(rows[12]["churned_active"], 0)
        self.assertAlmostEqual(rows[12]["retained_active"] + rows[12]["new_active"], rows[12]["target_active"], places=8)


if __name__ == "__main__":
    unittest.main()

