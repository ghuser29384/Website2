from __future__ import annotations

import unittest
from dataclasses import replace

import numpy as np

from moral_trade_impact_v2.config import load_parameters, load_scenarios
from moral_trade_impact_v2.model import HORIZONS, run_simulation


class ModelReconciliationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.parameters = load_parameters()
        cls.central = load_scenarios()[0]

    def test_fixed_reference_passes_every_accounting_invariant(self) -> None:
        fixed = {key: replace(value, distribution="fixed", low=value.central, high=value.central) for key, value in self.parameters.items()}
        result = run_simulation(self.central, "conditional", 8, 12345, parameters=fixed)
        for name, value in result.invariants.items():
            tolerance = 1e-5 if "field" in name else 1e-7
            self.assertLessEqual(value, tolerance, name)
        for horizon in HORIZONS:
            metrics = result.metrics[horizon]
            np.testing.assert_allclose(
                metrics["net_causal_cash"],
                metrics["new_cash"] + metrics["rescued_cash"] - metrics["donation_displacement"] - metrics["cash_operating_costs"],
                rtol=0, atol=1e-7,
            )
            self.assertTrue(np.all(metrics["donation_displacement"] <= metrics["new_cash"] + 1e-9))

    def test_fixed_seed_rerun_is_array_identical(self) -> None:
        first = run_simulation(self.central, "conditional", 128, 69520260814)
        second = run_simulation(self.central, "conditional", 128, 69520260814)
        for horizon in HORIZONS:
            for metric in first.metrics[horizon]:
                np.testing.assert_array_equal(first.metrics[horizon][metric], second.metrics[horizon][metric])

    def test_probability_weighted_basis_changes_liquidity_non_linearly(self) -> None:
        conditional = run_simulation(self.central, "conditional", 256, 991)
        weighted = run_simulation(self.central, "probability_weighted", 256, 991)
        conditional_values = conditional.metrics["five_year_cumulative"]
        weighted_values = weighted.metrics["five_year_cumulative"]
        redirect_ratio = np.divide(weighted_values["redirect_cleared_principal"], conditional_values["redirect_cleared_principal"], out=np.zeros(256), where=conditional_values["redirect_cleared_principal"] > 0)
        direct_ratio = np.divide(weighted_values["completed_direct_trades"], conditional_values["completed_direct_trades"], out=np.zeros(256), where=conditional_values["completed_direct_trades"] > 0)
        self.assertFalse(np.allclose(redirect_ratio, direct_ratio))

    def test_aggregate_direct_prices_are_formed_from_wtp_and_wta(self) -> None:
        result = run_simulation(self.central, "conditional", 512, 1776)
        diagnostics = result.structural_diagnostics
        wtp = diagnostics["direct_payer_wtp_usd_per_hour"]
        wta = diagnostics["direct_supplier_wta_usd_per_hour"]
        price = diagnostics["direct_accepted_price_usd_per_hour"]
        compatible = diagnostics["direct_price_compatible"].astype(bool)
        self.assertTrue(np.all(price[~compatible] == 0.0))
        self.assertTrue(np.all(price[compatible] >= wta[compatible] - 1e-12))
        self.assertTrue(np.all(price[compatible] <= wtp[compatible] + 1e-12))
        self.assertTrue(np.allclose(price[compatible], np.sqrt(wtp[compatible] * wta[compatible])))


if __name__ == "__main__":
    unittest.main()
