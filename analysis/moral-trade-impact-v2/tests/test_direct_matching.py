from __future__ import annotations

import unittest

from moral_trade_impact_v2.direct import (
    DemandOrder,
    SupplyOrder,
    clear_direct_orders,
    complementary_group_complete,
    same_action_group_completion,
)


class DirectMatchingTests(unittest.TestCase):
    def test_wtp_wta_price_and_conservation(self) -> None:
        demand = DemandOrder("d1", "dietary_animal_product", "factory_farming_reduction", 120, 600, "cause_directed", 3, 10)
        supply = SupplyOrder("s1", "dietary_animal_product", ("factory_farming_reduction",), 90, 150, 2, 10)
        fills = clear_direct_orders([demand], [supply], as_of_day=1)
        self.assertEqual(len(fills), 1)
        self.assertEqual(fills[0].quantity_minutes, 90)
        self.assertEqual(fills[0].price_cents_per_hour, 300)
        self.assertEqual(fills[0].payment_cents, 450)
        self.assertLessEqual(fills[0].price_cents_per_hour, demand.max_price_cents_per_hour)
        self.assertGreaterEqual(fills[0].price_cents_per_hour, supply.min_price_cents_per_hour)

    def test_evidence_and_price_mismatch_do_not_clear(self) -> None:
        demand = DemandOrder("d", "transport_carbon", "environmental_protection", 60, 200, "personal_income", 1, 10)
        supply = SupplyOrder("s", "transport_carbon", ("environmental_protection",), 60, 300, 2, 10)
        self.assertEqual(clear_direct_orders([demand], [supply], 1), ())

    def test_complementary_role_bottleneck(self) -> None:
        required = {"researcher": 1, "reviewer": 1, "operator": 2}
        self.assertFalse(complementary_group_complete(required, {"researcher": 1, "reviewer": 1, "operator": 1}))
        self.assertTrue(complementary_group_complete(required, {"researcher": 1, "reviewer": 2, "operator": 2}))

    def test_same_action_partial_completion(self) -> None:
        completed, fraction = same_action_group_completion((True, True, False, False), 2)
        self.assertTrue(completed)
        self.assertEqual(fraction, 0.5)


if __name__ == "__main__":
    unittest.main()
