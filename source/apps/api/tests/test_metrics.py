from __future__ import annotations

import unittest

from app.models.records import NotesWrittenSnapshot
from app.services.admission import AdmissionDashboardService
from app.services.writing_limit import WritingLimitMonitor
from app.settings import Settings


def note(index: int, claim: str = "high", url: str = "high", harassment: str = "high", crh: bool = True, crnh: bool = False):
    return NotesWrittenSnapshot(
        id=f"id-{index}",
        note_id=f"note-{index}",
        candidate_id=f"candidate-{index}",
        created_at=f"2026-05-{(index % 28) + 1:02d}T12:00:00Z",
        crh=crh,
        crnh=crnh,
        claim_opinion=claim,
        url_validity=url,
        harassment_abuse=harassment,
        helpfulness="high" if crh else "low",
    )


class MetricTests(unittest.TestCase):
    def test_admission_thresholds(self) -> None:
        notes = [note(i) for i in range(40)] + [note(i, claim="low", crh=False, crnh=True) for i in range(40, 50)]
        window = AdmissionDashboardService(Settings()).compute(notes)
        self.assertTrue(window.eligible_boolean)
        self.assertGreaterEqual(window.claim_opinion_high_rate, 0.30)
        self.assertLessEqual(window.claim_opinion_low_rate, 0.30)

    def test_admission_blocks_bad_url_validity(self) -> None:
        notes = [note(i, url="low") for i in range(50)]
        window = AdmissionDashboardService(Settings()).compute(notes)
        self.assertFalse(window.eligible_boolean)
        self.assertIn("UrlValidity high rate below 95%", window.blockers)

    def test_writing_limit_formulas(self) -> None:
        notes = [note(i, crh=i % 2 == 0, crnh=i % 5 == 0) for i in range(30)]
        snapshot = WritingLimitMonitor().compute(notes)
        self.assertIn("HR_100", snapshot.formulas)
        self.assertIn("WL", snapshot.formulas)
        self.assertEqual(snapshot.wl, snapshot.estimated_writing_limit)
        self.assertEqual(snapshot.t, snapshot.total_notes)
        self.assertEqual(snapshot.total_notes, 30)
        self.assertGreaterEqual(snapshot.estimated_writing_limit, 1)
        self.assertIn("small", snapshot.feed_size_eligibility)
        self.assertIn("large", snapshot.feed_size_eligibility)
        self.assertIn("xl", snapshot.feed_size_eligibility)
        self.assertIn("xxl", snapshot.feed_size_eligibility)
        self.assertTrue(snapshot.feed_size_eligibility["large"]["non_test_mode_only"])


if __name__ == "__main__":
    unittest.main()
