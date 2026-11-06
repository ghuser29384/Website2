from __future__ import annotations

from collections import defaultdict

from app.models.records import Claim, DraftNote, EvidenceCard, EvidenceSource, InternalScore, new_id, stable_id
from app.services.providers import BraveSearchClient, OpenAIResponsesClient, ProviderError
from app.settings import Settings


class StrictJSONFailure(ValueError):
    pass


def _fixture_for(candidate: dict, key: str) -> list[dict]:
    return candidate.get("fixture", {}).get(key, [])


class ClaimExtractor:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    def extract(self, candidate, raw_fixture: dict) -> list[Claim]:
        if not raw_fixture.get("fixture_claims") and self.settings.llm_provider == "openai" and self.settings.allow_live_llm:
            return self._extract_with_openai(candidate)
        claims = []
        for item in raw_fixture.get("fixture_claims", []):
            if not isinstance(item, dict) or "text" not in item:
                raise StrictJSONFailure("Fixture LLM output failed strict claim schema")
            claims.append(
                Claim(
                    id=new_id(),
                    candidate_id=candidate.id,
                    text=item["text"],
                    checkability_score=float(item.get("checkability_score", 0.0)),
                    sourceability_hint=item.get("sourceability_hint", ""),
                    opinion_sarcasm_flag=bool(item.get("opinion_sarcasm_flag", False)),
                    abstain_reasons=list(item.get("abstain_reasons", [])),
                    status="ABSTAIN" if item.get("opinion_sarcasm_flag") or item.get("abstain_reasons") else "CHECKABLE",
                )
            )
        return claims

    def _extract_with_openai(self, candidate) -> list[Claim]:
        client = OpenAIResponsesClient(self.settings)
        result = client.generate_json(
            "Extract externally checkable claims for Community Notes drafting. Return only JSON: "
            '{"claims":[{"text":"...","checkability_score":0.0,"sourceability_hint":"...",'
            '"opinion_sarcasm_flag":false,"abstain_reasons":[]}]}',
            candidate.text,
        )
        claims = []
        for item in result.get("claims", []):
            claims.append(
                Claim(
                    id=new_id(),
                    candidate_id=candidate.id,
                    text=item["text"],
                    checkability_score=float(item.get("checkability_score", 0.0)),
                    sourceability_hint=item.get("sourceability_hint", ""),
                    opinion_sarcasm_flag=bool(item.get("opinion_sarcasm_flag", False)),
                    abstain_reasons=list(item.get("abstain_reasons", [])),
                    status="ABSTAIN" if item.get("opinion_sarcasm_flag") or item.get("abstain_reasons") else "CHECKABLE",
                )
            )
        return claims


class SourceSuggestionIngestor:
    def ingest(self, candidate) -> list[EvidenceSource]:
        sources = []
        crowd_filter = getattr(candidate, "crowd_signal_filter", {}) or {}
        source_items = crowd_filter.get("accepted_suggested_source_links") or candidate.suggested_source_links_with_counts
        for item in source_items:
            count = int(item.get("count", 0))
            publisher = item.get("publisher", "")
            source_type = "official" if any(token in publisher.lower() for token in ["ministry", "centers for disease", "agency"]) else "suggested"
            sources.append(
                EvidenceSource(
                    id=stable_id(candidate.id, item.get("url", "")),
                    candidate_id=candidate.id,
                    url=item.get("url", ""),
                    title=item.get("title", item.get("url", "")),
                    publisher=publisher,
                    source_type=source_type,
                    suggested_count=count,
                    reliability_score=0.82 if source_type == "official" else 0.55,
                    relevance_score=min(1.0, 0.4 + count / 20),
                )
            )
        sources.sort(key=lambda source: (source.suggested_count, source.reliability_score), reverse=True)
        return sources


class SearchPlanner:
    def plan(self, claims: list[Claim]) -> list[dict]:
        queries = []
        for claim in claims:
            if claim.status != "CHECKABLE":
                continue
            stem = claim.text.rstrip(".")
            queries.extend(
                [
                    {"claim_id": claim.id, "query": f"official source {stem}", "preferred_source_type": "official"},
                    {"claim_id": claim.id, "query": f"institutional data {stem}", "preferred_source_type": "institutional"},
                    {"claim_id": claim.id, "query": f"primary source {stem}", "preferred_source_type": "primary"},
                    {"claim_id": claim.id, "query": f"standards legal peer reviewed {stem}", "preferred_source_type": "reputable"},
                ]
            )
        return queries[:8]


class EvidenceRetriever:
    def __init__(self, settings: Settings):
        self.settings = settings

    def retrieve(self, candidate, claims: list[Claim], raw_fixture: dict, sources: list[EvidenceSource]) -> list[EvidenceCard]:
        cards = []
        claim_by_text = {claim.text: claim for claim in claims}
        first_checkable = next((claim for claim in claims if claim.status == "CHECKABLE"), None)
        source_by_url = {source.url: source for source in sources}
        for item in raw_fixture.get("fixture_evidence", []):
            claim = claim_by_text.get(item.get("claim_text")) or first_checkable
            if not claim:
                continue
            source = source_by_url.get(item.get("url"))
            if not source:
                source = EvidenceSource(
                    id=stable_id(candidate.id, item["url"]),
                    candidate_id=candidate.id,
                    url=item["url"],
                    title=item["title"],
                    publisher=item["publisher"],
                    source_type=item["source_type"],
                    reliability_score=float(item.get("reliability_score", 0.0)),
                    relevance_score=float(item.get("coverage_score", 0.0)),
                )
                sources.append(source)
                source_by_url[source.url] = source
            cards.append(
                EvidenceCard(
                    id=new_id(),
                    candidate_id=candidate.id,
                    claim_id=claim.id,
                    source_id=source.id,
                    url=item["url"],
                    title=item["title"],
                    publisher=item["publisher"],
                    source_type=item["source_type"],
                    date=item["date"],
                    snippet=item["snippet"],
                    reliability_score=float(item.get("reliability_score", 0.0)),
                    directness_score=float(item.get("directness_score", 0.0)),
                    timeliness_score=float(item.get("timeliness_score", 0.0)),
                    contradiction_score=float(item.get("contradiction_score", 0.0)),
                    coverage_score=float(item.get("coverage_score", 0.0)),
                )
            )
        if not cards and self.settings.search_provider == "brave" and self.settings.allow_live_search:
            cards.extend(self._retrieve_with_brave(candidate, claims, sources))
        return cards[: self.settings.per_candidate_search_budget]

    def _retrieve_with_brave(self, candidate, claims: list[Claim], sources: list[EvidenceSource]) -> list[EvidenceCard]:
        client = BraveSearchClient(self.settings)
        cards: list[EvidenceCard] = []
        for claim in claims:
            if claim.status != "CHECKABLE":
                continue
            query = claim.sourceability_hint or claim.text
            for item in client.search(query, count=3):
                url = item.get("url") or item.get("profile", {}).get("url") or ""
                if not url:
                    continue
                source = EvidenceSource(
                    id=stable_id(candidate.id, url),
                    candidate_id=candidate.id,
                    url=url,
                    title=item.get("title", url),
                    publisher=item.get("profile", {}).get("name", "") or item.get("meta_url", {}).get("hostname", ""),
                    source_type="search_result",
                    reliability_score=0.55,
                    relevance_score=0.60,
                )
                sources.append(source)
                cards.append(
                    EvidenceCard(
                        id=new_id(),
                        candidate_id=candidate.id,
                        claim_id=claim.id,
                        source_id=source.id,
                        url=source.url,
                        title=source.title,
                        publisher=source.publisher,
                        source_type=source.source_type,
                        date="",
                        snippet=item.get("description", ""),
                        reliability_score=source.reliability_score,
                        directness_score=0.60,
                        timeliness_score=0.50,
                        coverage_score=0.60,
                    )
                )
        return cards


class EvidenceAuditor:
    def audit(self, cards: list[EvidenceCard]) -> list[EvidenceCard]:
        for card in cards:
            weak = []
            if card.reliability_score < 0.75:
                weak.append("weak_source")
            if card.directness_score < 0.70:
                weak.append("indirect_evidence")
            if card.contradiction_score > 0.35:
                weak.append("contradictory")
            if card.coverage_score < 0.70:
                weak.append("insufficient_claim_coverage")
            card.approved = not weak
            card.rejection_reasons = weak
        return cards


class DraftGenerator:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    def generate(self, candidate, raw_fixture: dict, claims: list[Claim], cards: list[EvidenceCard]) -> list[DraftNote]:
        approved = [card for card in cards if card.approved]
        if not approved or any(claim.status == "ABSTAIN" for claim in claims):
            return [
                DraftNote(
                    id=new_id(),
                    candidate_id=candidate.id,
                    text="ABSTAIN: The post is opinion, sarcasm, duplicate, already covered, unclear, or lacks sufficient approved evidence.",
                    status="ABSTAIN",
                    factual_sentences=[],
                    support_map_json={},
                    evidence_brief="No note should be submitted because the candidate does not meet sourceability and checkability requirements.",
                )
            ]
        cards_by_claim = defaultdict(list)
        for card in approved:
            cards_by_claim[card.claim_id].append(card)
        all_source_ids = [card.source_id for card in approved]
        drafts = []
        source_items = raw_fixture.get("fixture_drafts", [])
        if not source_items and self.settings.llm_provider == "openai" and self.settings.allow_live_llm:
            source_items = self._generate_with_openai(candidate, claims, approved)
        for item in source_items[:3]:
            support = {}
            for sentence in item.get("factual_sentences", []):
                support[sentence] = all_source_ids
            drafts.append(
                DraftNote(
                    id=new_id(),
                    candidate_id=candidate.id,
                    text=item["text"],
                    status="DRAFTED",
                    factual_sentences=list(item.get("factual_sentences", [])),
                    support_map_json=support,
                    evidence_brief="\n".join(f"{card.publisher}: {card.snippet}" for card in approved),
                )
            )
        return drafts

    def _generate_with_openai(self, candidate, claims: list[Claim], cards: list[EvidenceCard]) -> list[dict]:
        client = OpenAIResponsesClient(self.settings)
        evidence = "\n".join(f"- {card.publisher}: {card.snippet} ({card.url})" for card in cards)
        claims_text = "\n".join(f"- {claim.text}" for claim in claims if claim.status == "CHECKABLE")
        try:
            result = client.generate_json(
                "Draft 1-3 concise Community Notes from provided claims and evidence. "
                "Every factual sentence must be supported by the evidence. Return only JSON: "
                '{"drafts":[{"text":"...","factual_sentences":["..."]}]}',
                f"Post:\n{candidate.text}\n\nClaims:\n{claims_text}\n\nEvidence:\n{evidence}",
            )
        except (ProviderError, ValueError):
            return []
        return list(result.get("drafts", []))


class InternalCritic:
    def critique(self, draft: DraftNote, cards: list[EvidenceCard]) -> InternalScore:
        issues = []
        approved_cards = [card for card in cards if card.approved]
        if draft.status == "ABSTAIN":
            issues.append("abstain_draft_cannot_submit")
        if not draft.support_map_covers_all_factual_sentences():
            issues.append("unsupported_factual_sentence")
        if not approved_cards:
            issues.append("no_approved_evidence")
        source_quality = sum(card.reliability_score for card in approved_cards) / len(approved_cards) if approved_cards else 0.0
        grounding_pass = not issues and source_quality >= 0.75
        return InternalScore(
            id=new_id(),
            draft_id=draft.id,
            grounding_pass=grounding_pass,
            neutrality_score=0.91 if grounding_pass else 0.55,
            helpfulness_probability=0.82 if grounding_pass else 0.20,
            stability_risk=0.14 if grounding_pass else 0.88,
            source_quality_score=source_quality,
            high_severity_issues=issues,
            overclaiming_score=0.05 if grounding_pass else 0.65,
            missing_context_score=0.10 if grounding_pass else 0.50,
        )
