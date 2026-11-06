from __future__ import annotations

import unittest

from app.models.records import CandidatePost, Claim, DraftNote, InternalScore, ValidationError, new_id


class SchemaValidationTests(unittest.TestCase):
    def test_candidate_post_validation(self) -> None:
        candidate = CandidatePost.validate_dict(
            {
                "id": new_id(),
                "x_post_id": "191",
                "text": "A checkable post",
                "author_id": "author",
            }
        )
        self.assertEqual(candidate.status, "NEW")

    def test_missing_required_schema_field_fails(self) -> None:
        with self.assertRaises(ValidationError):
            Claim.validate_dict({"id": new_id(), "candidate_id": new_id()})

    def test_draft_support_map_requires_every_sentence(self) -> None:
        draft = DraftNote(
            id=new_id(),
            candidate_id=new_id(),
            text="One. Two.",
            factual_sentences=["One.", "Two."],
            support_map_json={"One.": ["source-1"]},
        )
        self.assertFalse(draft.support_map_covers_all_factual_sentences())
        draft.support_map_json["Two."] = ["source-2"]
        self.assertTrue(draft.support_map_covers_all_factual_sentences())

    def test_internal_score_high_severity(self) -> None:
        score = InternalScore(
            id=new_id(),
            draft_id=new_id(),
            grounding_pass=False,
            neutrality_score=0.5,
            helpfulness_probability=0.1,
            stability_risk=0.9,
            source_quality_score=0.0,
            high_severity_issues=["unsupported_factual_sentence"],
        )
        self.assertTrue(score.has_high_severity_issue())


if __name__ == "__main__":
    unittest.main()

