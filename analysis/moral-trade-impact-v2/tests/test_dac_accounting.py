from __future__ import annotations

import unittest

import numpy as np

from moral_trade_impact_v2.config import load_scenarios
from moral_trade_impact_v2.dac import (
    DACPool,
    PledgeRequest,
    ReserveLedger,
    bonus_rate_bps,
    gross_threshold_cents,
    stress_percentile_rate,
)
from moral_trade_impact_v2.model import _choose_surcharge


class DACAccountingTests(unittest.TestCase):
    def test_success_reconciles_target_surcharge_and_release(self) -> None:
        reserve = ReserveLedger(100_000)
        pool = DACPool("pool", 10_000, 500, 10)
        self.assertEqual(gross_threshold_cents(10_000, 500), 10_500)
        self.assertTrue(pool.authorize(PledgeRequest("p1", "u1", 5_000, 0), reserve))
        self.assertTrue(pool.authorize(PledgeRequest("p2", "u2", 5_500, 10), reserve))
        self.assertEqual(reserve.locked_liability_cents, 610)
        settled = pool.settle(reserve)
        self.assertEqual(settled["status"], "success")
        self.assertEqual(settled["project_receipt_cents"], 10_000)
        self.assertEqual(settled["surcharge_cents"], 500)
        self.assertEqual(settled["liability_released_cents"], 610)
        self.assertEqual(reserve.reserve_cash_cents, 100_500)
        self.assertEqual(reserve.locked_liability_cents, 0)

    def test_lapse_returns_principal_and_pays_each_frozen_bonus(self) -> None:
        reserve = ReserveLedger(10_000)
        pool = DACPool("pool", 20_000, 500, 10)
        pool.authorize(PledgeRequest("early", "u1", 1_000, 0), reserve)
        settled = pool.settle(reserve)
        self.assertEqual(settled["status"], "lapse")
        self.assertEqual(settled["principal_returned_cents"], 1_000)
        self.assertEqual(settled["bonus_paid_cents"], 100)
        self.assertEqual(reserve.reserve_cash_cents, 9_900)
        self.assertEqual(reserve.locked_liability_cents, 0)

    def test_uncovered_pledge_waits_and_never_funds(self) -> None:
        reserve = ReserveLedger(50)
        pool = DACPool("pool", 10_000, 500, 10)
        self.assertFalse(pool.authorize(PledgeRequest("p", "u", 1_000, 0), reserve))
        self.assertEqual(pool.pledged_principal_cents, 0)
        self.assertEqual(pool.waiting_or_rejected_cents, 1_000)
        self.assertEqual(reserve.locked_liability_cents, 0)

    def test_time_schedule_decreases_and_topups_freeze_later_rate(self) -> None:
        self.assertEqual(bonus_rate_bps(0, 10), 1000)
        self.assertEqual(bonus_rate_bps(10, 10), 200)
        self.assertGreater(bonus_rate_bps(2, 10), bonus_rate_bps(8, 10))

    def test_invalid_pledge_receives_no_bonus(self) -> None:
        reserve = ReserveLedger(1_000)
        pool = DACPool("pool", 10_000, 500, 10)
        self.assertFalse(pool.authorize(PledgeRequest("bad", "u", 1_000, 1, valid=False), reserve))
        self.assertEqual(reserve.locked_liability_cents, 0)

    def test_stress_policy_selects_lowest_solvent_grid_rate(self) -> None:
        scenario = next(item for item in load_scenarios() if item.dac_policy == "stress_percentile")
        samples = {
            "dac_surcharge_min": np.asarray([0.02]),
            "dac_surcharge_max": np.asarray([0.15]),
            "dac_stress_percentile": np.asarray([0.50]),
            "dac_controller_free_target": np.asarray([0.45]),
            "dac_controller_gain": np.asarray([0.04]),
        }
        selected = _choose_surcharge(
            np.asarray([0.05]),
            np.asarray([100.0]),
            np.asarray([150.0]),
            np.asarray([1_000.0]),
            samples,
            scenario,
        )
        self.assertAlmostEqual(float(selected[0]), 0.05)
        self.assertEqual(stress_percentile_rate(150.0, 100.0, 1_000.0), 0.05)
        self.assertLess(100.0 + 1_000.0 * 0.04, 150.0)
        self.assertGreaterEqual(100.0 + 1_000.0 * float(selected[0]), 150.0)


if __name__ == "__main__":
    unittest.main()
