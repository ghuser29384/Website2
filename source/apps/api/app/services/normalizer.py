from __future__ import annotations

import re

from app.models.records import CandidatePost, new_id, sha256_text


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


class CandidateNormalizer:
    def from_x_post(self, raw: dict) -> CandidatePost:
        text = normalize_text(raw.get("note_tweet", {}).get("text") or raw.get("text", ""))
        referenced = raw.get("referenced_posts", [])
        quoted = raw.get("quoted_posts", [])
        replied = raw.get("replied_to_posts", [])
        media = raw.get("media_metadata", [])
        context = {
            "text": text,
            "note_tweet": raw.get("note_tweet", {}),
            "referenced_posts": referenced,
            "quoted_posts": quoted,
            "replied_to_posts": replied,
            "media_metadata": media,
            "suggested_source_links_with_counts": raw.get("suggested_source_links_with_counts", []),
            "note_request_suggestions": raw.get("note_request_suggestions", []),
        }
        canonical_hash = sha256_text(
            "|".join(
                [
                    text.lower(),
                    " ".join(normalize_text(item.get("text", "")).lower() for item in referenced),
                    " ".join(normalize_text(item.get("text", "")).lower() for item in quoted),
                    " ".join(normalize_text(item.get("text", "")).lower() for item in replied),
                ]
            )
        )
        return CandidatePost(
            id=new_id(),
            x_post_id=str(raw["x_post_id"]),
            text=text,
            author_id=str(raw.get("author_id", "unknown")),
            lang=raw.get("lang", "en"),
            canonical_hash=canonical_hash,
            note_tweet=raw.get("note_tweet", {}),
            referenced_posts=referenced,
            quoted_posts=quoted,
            replied_to_posts=replied,
            media_metadata=media,
            suggested_source_links_with_counts=raw.get("suggested_source_links_with_counts", []),
            note_request_suggestions=raw.get("note_request_suggestions", []),
            normalized_context=context,
        )
