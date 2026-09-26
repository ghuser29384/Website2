from __future__ import annotations

import unittest

from moral_trade_impact_v2.clearing import CreatorOrder, MatcherOrder, clear_order_book


class RedirectClearingTests(unittest.TestCase):
    def test_many_to_many_exact_cent_reconciliation(self) -> None:
        creators = [
            CreatorOrder("opposed-a", "opposed", "side-a", ("shared",), 1000, 500, True, 10, baseline_class="lower_impact"),
            CreatorOrder("opposed-b", "opposed", "side-b", ("shared",), 800, 500, True, 10, baseline_class="high_impact"),
            CreatorOrder("lower-a", "lower_impact", "fallback-a", ("shared", "other"), 1000, 500, True, 10, 2000, "lower_impact"),
        ]
        matchers = [
            MatcherOrder("matcher-a", ("fallback-a",), ("shared",), 100, 10),
            MatcherOrder("matcher-b", ("fallback-a",), ("shared", "other"), 100, 10),
        ]
        result = clear_order_book(creators, matchers, as_of_day=1)
        self.assertEqual(result.planned_principal_cents, 2800)
        self.assertEqual(result.cleared_principal_cents, 2600)
        self.assertEqual(result.addon_cents, 200)
        self.assertEqual(result.rescued_cents, 1800)
        self.assertEqual(result.reallocation_cents, 800)
        self.assertEqual(result.unmatched_fallback_cents, 200)
        self.assertEqual(len({fill.creator_authorization_id for fill in result.fills}), len(result.fills))
        self.assertEqual(result.cleared_principal_cents, result.rescued_cents + result.reallocation_cents)

    def test_full_fill_is_not_partially_cleared(self) -> None:
        creator = CreatorOrder("creator", "lower_impact", "fallback", ("field",), 1000, 1000, False, 10, 2000)
        matcher = MatcherOrder("matcher", ("fallback",), ("field",), 100, 10)
        result = clear_order_book([creator], [matcher], as_of_day=1)
        self.assertEqual(result.cleared_principal_cents, 0)
        self.assertEqual(result.unmatched_fallback_cents, 1000)

    def test_duplicate_authorization_fails_closed(self) -> None:
        creators = [
            CreatorOrder("same", "lower_impact", "a", ("field",), 100, 100, False, 10),
            CreatorOrder("same", "lower_impact", "a", ("field",), 100, 100, False, 10),
        ]
        with self.assertRaises(ValueError):
            clear_order_book(creators, [], as_of_day=1)


if __name__ == "__main__":
    unittest.main()
