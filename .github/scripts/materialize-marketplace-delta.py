#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
ACTIONS = ROOT / "src/app/actions.ts"
OFFERS_PAGE = ROOT / "src/app/offers/page.tsx"
OFFER_DETAIL = ROOT / "src/app/offers/[offerId]/page.tsx"
COMMENT_THREAD = ROOT / "src/components/community/comment-thread.tsx"
MIGRATION_VERSION = "20260729170000"
MIGRATION_NAME = "marketplace_atomic_acceptance_current_core"
MIGRATION_PATH = ROOT / "supabase/migrations" / f"{MIGRATION_VERSION}_{MIGRATION_NAME}.sql"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label}; found {count}.")
    return source.replace(old, new, 1)


def replace_between(
    source: str,
    start_marker: str,
    end_marker: str,
    replacement: str,
    label: str,
) -> str:
    start_count = source.count(start_marker)
    if start_count != 1:
        raise RuntimeError(f"Expected exactly one {label} start marker; found {start_count}.")
    start = source.index(start_marker)
    end = source.find(end_marker, start + len(start_marker))
    if end < 0:
        raise RuntimeError(f"Missing {label} end marker.")
    return source[:start] + replacement + source[end:]


def git_rev(ref: str) -> str:
    return subprocess.check_output(["git", "rev-parse", ref], text=True).strip()


def extract_latest_function(function_name: str) -> tuple[Path, str]:
    marker = f"create or replace function public.{function_name}("
    latest: tuple[Path, str] | None = None
    for path in sorted((ROOT / "supabase/migrations").glob("*.sql")):
        source = path.read_text(encoding="utf-8")
        cursor = 0
        while True:
            start = source.find(marker, cursor)
            if start < 0:
                break
            end = source.find("\n$function$;", start)
            if end < 0:
                raise RuntimeError(f"Could not isolate {function_name} in {path}.")
            end += len("\n$function$;")
            latest = (path, source[start:end])
            cursor = end
    if latest is None:
        raise RuntimeError(f"No migration defines {function_name}.")
    return latest


def write_audit() -> None:
    main_sha = git_rev("HEAD")
    pr158_sha = git_rev("origin/agent/dynamic-marketplace-clearing-rounds")
    path = ROOT / "docs/marketplace-pr158-delta-audit.md"
    path.write_text(
        f"""# PR #158 delta audit against current main

## Audited refs

- Current-main base for this candidate: `{main_sha}`
- Historical PR #158 head: `{pr158_sha}`
- Candidate branch: `agent/marketplace-delta-current-main-20260729`

## Decision

Current `main` already contains the canonical live-offer directory, structured Create flow,
saved offers, signed-in responses, public comments, private message threads, immutable
counterproposals, frozen agreement versions, bilateral confirmation, evidence submission,
completion confirmation, and exit controls. The candidate therefore carries only the missing
or materially better delta. It does not reconstruct PR #158 wholesale.

## Classification

| PR #158 area | Classification | Candidate treatment |
|---|---|---|
| Sequential member and claimed-guest acceptance | Missing integrity boundary | Replace with two PostgreSQL RPCs that atomically accept the response, create the proposed agreement and frozen version through the existing core triggers, decline competing responses, and close the non-repeatable offer. |
| Closed-offer bilateral confirmation compatibility | Missing schema contract | Narrowly extend the existing `confirm_agreement_version_v2` function so an accepted response-backed proposed agreement can be confirmed after its source offer becomes `matched` / `closed`. |
| Participant-level marketplace grouping | Useful presentation delta | Group exact published offers by owner while preserving every offer as a distinct authorized proposal. No Cartesian or generated pairing is shown as if the owner authorized it. |
| Inline marketplace actions | Useful interaction delta | Add exact-offer Respond, Counteroffer, Ask, Save, and Open-details actions to each proposal inside the participant group. All actions retain the exact `offer.id`. |
| Dedicated question route | Duplicative | Do not add a new question page. Improve the existing offer discussion form with pending state, success copy, reset-after-success, and correct empty-state behavior. |
| `/deals/[agreementId]` dealroom | Duplicative | Do not add it. Continue using `/messages/[threadId]` for negotiation and `/trade-agreements/[agreementId]` as the sole frozen agreement, confirmation, evidence, completion, and exit record. |
| `completion_state`, `agreement_evidence_items`, `agreement_review_cases` | Duplicative with current core trade lifecycle and evidence tables | Do not add them. Align atomic acceptance to the existing `lifecycle_status`, `trade_agreement_versions`, `trade_agreement_confirmations`, `trade_evidence_items`, `trade_completion_confirmations`, and `trade_exit_requests` contract. |
| Separate dealroom terms editor/history implementation | Already present in canonical agreement and message routes | Exclude. |
| Weekly clearing-round presentation | Out of scope for this integrity and entry-point delta | Exclude. Continuous exact-offer responses and counteroffers remain available. |
| Worked-example and synthetic-completion presentation | Already handled elsewhere and not live liquidity | Exclude. |
| PR-specific QA bootstrap, runbook, and Vercel configuration files | Operational scaffolding, not product code | Exclude from the product candidate. |

## Why the grouping is a real improvement rather than generated liquidity

The current directory repeats one full card per offer and requires a navigation before the user
can respond, counteroffer, ask, or save. The new grouping removes repeated participant identity
chrome and exposes those actions immediately, but it still renders one bounded row per exact
published offer. A participant with three offers contributes three rows—not nine synthetic
combinations of offered and requested terms.

The candidate must satisfy all of the following:

1. Flattening all participant groups returns the same offer IDs, in the same order, exactly once.
2. Every action URL or form carries the exact published `offer.id`.
3. Counteroffers are explicitly new proposals based on `source_offer`; they are not represented as standing offers.
4. Pagination and hard-constraint filtering remain offer-based, so grouping cannot hide or manufacture inventory.
5. No product route under `/deals` is added.

## Production ordering

The database migration must be applied and verified before application deployment because the
new server actions invoke the two atomic RPCs. No production migration or deployment is part of
this candidate-materialization step.
""",
        encoding="utf-8",
    )


def write_grouping_helper() -> None:
    path = ROOT / "src/lib/marketplace-participant-groups.ts"
    path.write_text(
        '''export interface MarketplaceParticipantOffer {
  created_at: string;
  id: string;
  owner_alias: string;
  owner_id: string;
}

export interface MarketplaceParticipantGroup<T extends MarketplaceParticipantOffer> {
  offers: T[];
  ownerId: string;
  participantName: string;
}

export function groupOffersByParticipant<T extends MarketplaceParticipantOffer>(
  offers: readonly T[],
): MarketplaceParticipantGroup<T>[] {
  const groups = new Map<string, MarketplaceParticipantGroup<T>>();

  for (const offer of offers) {
    const existing = groups.get(offer.owner_id);
    if (existing) {
      existing.offers.push(offer);
      if (existing.participantName === "Participant" && offer.owner_alias.trim()) {
        existing.participantName = offer.owner_alias.trim();
      }
      continue;
    }

    groups.set(offer.owner_id, {
      offers: [offer],
      ownerId: offer.owner_id,
      participantName: offer.owner_alias.trim() || "Participant",
    });
  }

  return [...groups.values()];
}
''',
        encoding="utf-8",
    )

    test_path = ROOT / "src/lib/marketplace-participant-groups.test.ts"
    test_path.write_text(
        '''import assert from "node:assert/strict";
import test from "node:test";

import { groupOffersByParticipant } from "./marketplace-participant-groups";

const offers = [
  {
    created_at: "2026-07-29T00:00:00.000Z",
    id: "offer-a",
    owner_alias: "Victoria",
    owner_id: "owner-v",
    offered_cause: "Global health",
    requested_cause: "Animal welfare",
  },
  {
    created_at: "2026-07-29T00:01:00.000Z",
    id: "offer-b",
    owner_alias: "Paul",
    owner_id: "owner-p",
    offered_cause: "Animal welfare",
    requested_cause: "Global health",
  },
  {
    created_at: "2026-07-29T00:02:00.000Z",
    id: "offer-c",
    owner_alias: "Victoria",
    owner_id: "owner-v",
    offered_cause: "Grant review",
    requested_cause: "Vegetarian meals",
  },
] as const;

test("groups exact offers by participant without generating cross-product pairings", () => {
  const groups = groupOffersByParticipant(offers);

  assert.deepEqual(
    groups.map((group) => ({
      ids: group.offers.map((offer) => offer.id),
      ownerId: group.ownerId,
      participantName: group.participantName,
    })),
    [
      {
        ids: ["offer-a", "offer-c"],
        ownerId: "owner-v",
        participantName: "Victoria",
      },
      {
        ids: ["offer-b"],
        ownerId: "owner-p",
        participantName: "Paul",
      },
    ],
  );

  assert.deepEqual(
    groups.flatMap((group) => group.offers.map((offer) => offer.id)).toSorted(),
    offers.map((offer) => offer.id).toSorted(),
  );
});

test("preserves first-seen participant order and exact offer order", () => {
  const groups = groupOffersByParticipant(offers);
  assert.deepEqual(groups.map((group) => group.ownerId), ["owner-v", "owner-p"]);
  assert.deepEqual(groups[0]?.offers.map((offer) => offer.id), ["offer-a", "offer-c"]);
});
''',
        encoding="utf-8",
    )


def write_participant_component() -> None:
    component_path = ROOT / "src/components/marketplace/participant-offer-group.tsx"
    component_path.write_text(
        '''import Link from "next/link";

import { toggleCartAction } from "@/app/actions";
import { formatMode } from "@/lib/offers";
import { isVerifiedEvidenceText } from "@/lib/smart-query-records";
import type { Database } from "@/lib/supabase/database.types";

import styles from "./participant-offer-group.module.css";

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

interface ParticipantOfferGroupProps {
  currentReturnTo: string;
  isAuthenticated: boolean;
  offers: OfferRow[];
  participantName: string;
  savedOfferIds: ReadonlySet<string>;
  viewerId: string | null;
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function authHref(path: string, isAuthenticated: boolean, mode: "login" | "signup") {
  return isAuthenticated ? path : `/${mode}?returnTo=${encodeURIComponent(path)}`;
}

export function ParticipantOfferGroup({
  currentReturnTo,
  isAuthenticated,
  offers,
  participantName,
  savedOfferIds,
  viewerId,
}: ParticipantOfferGroupProps) {
  const ownerId = offers[0]?.owner_id;
  if (!ownerId || !offers.length) return null;

  const headingId = `participant-${ownerId}`;

  return (
    <article aria-labelledby={headingId} className={styles.group}>
      <header className={styles.groupHeader}>
        <div className={styles.identity}>
          <span aria-hidden="true" className={styles.avatar}>{initials(participantName)}</span>
          <div>
            <p className={styles.kicker}>Participant menu</p>
            <h3 id={headingId}>{participantName}</h3>
          </div>
        </div>
        <span className={styles.proposalCount}>
          {offers.length} exact proposal{offers.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className={styles.offerList}>
        {offers.map((offer) => {
          const offerHref = `/offers/${offer.id}`;
          const respondHref = `${offerHref}#respond`;
          const questionHref = `${offerHref}#discussion`;
          const counterofferHref = `/offers/new?mode=${offer.mode}&source_offer=${offer.id}`;
          const isOwner = viewerId === offer.owner_id;
          const saved = savedOfferIds.has(offer.id);
          const verified = isVerifiedEvidenceText(offer.verification);

          return (
            <section className={styles.offer} key={offer.id}>
              <div className={styles.offerHeading}>
                <div>
                  <p className={styles.kicker}>{formatMode(offer.mode)}</p>
                  <h4>{offer.offered_cause} <span aria-hidden="true">↔</span> {offer.requested_cause}</h4>
                </div>
                <span className={styles.liveState}>Exact published proposal</span>
              </div>

              <div className={styles.exchange}>
                <div className={styles.termCard}>
                  <span>Offers</span>
                  <strong>{offer.offer_action}</strong>
                </div>
                <span aria-hidden="true" className={styles.exchangeArrow}>↔</span>
                <div className={styles.termCard}>
                  <span>Requests</span>
                  <strong>{offer.request_action}</strong>
                </div>
              </div>

              <div className={styles.meta}>
                <span>{offer.duration}</span>
                <span>{verified ? "Named verification evidence" : "Verification terms stated"}</span>
                <span>{offer.discount_note || "Bounded terms"}</span>
              </div>

              <div className={styles.actions}>
                <Link
                  className="button button-primary button-mini"
                  href={isOwner ? offerHref : authHref(respondHref, isAuthenticated, "login")}
                >
                  {isOwner ? "Manage" : "Respond"}
                </Link>
                {!isOwner ? (
                  <Link
                    className="button button-secondary button-mini"
                    href={authHref(counterofferHref, isAuthenticated, "signup")}
                  >
                    Counteroffer
                  </Link>
                ) : null}
                <Link className="button button-secondary button-mini" href={questionHref}>
                  Ask
                </Link>
                {isAuthenticated && !isOwner ? (
                  <form action={toggleCartAction}>
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_to" type="hidden" value={currentReturnTo} />
                    <button className="button button-secondary button-mini" type="submit">
                      {saved ? "Remove saved" : "Save"}
                    </button>
                  </form>
                ) : !isAuthenticated ? (
                  <Link
                    className="button button-secondary button-mini"
                    href={`/login?returnTo=${encodeURIComponent(offerHref)}`}
                  >
                    Save
                  </Link>
                ) : null}
                <Link className={styles.detailLink} href={offerHref}>Open full terms ↗</Link>
              </div>

              <p className={styles.truthNote}>
                These are the owner&apos;s exact published terms. Counteroffer opens a new proposal;
                it does not imply that this participant has already accepted a different combination.
              </p>
            </section>
          );
        })}
      </div>
    </article>
  );
}
''',
        encoding="utf-8",
    )

    css_path = ROOT / "src/components/marketplace/participant-offer-group.module.css"
    css_path.write_text(
        '''.group {
  overflow: hidden;
  border: 1px solid #dfe8e1;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(18, 46, 29, 0.07);
}

.groupHeader {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #e6ede8;
  background: linear-gradient(145deg, #f7fbf8 0%, #eef6f0 100%);
}

.identity {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.identity h3,
.offerHeading h4 {
  margin: 0;
  color: #172119;
}

.identity h3 {
  font-size: 1.05rem;
}

.avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #0a8f47;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.kicker {
  margin: 0 0 4px;
  color: #08763c;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.proposalCount,
.liveState {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 28px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #ffffff;
  color: #31503a;
  font-size: 0.76rem;
  font-weight: 700;
}

.offerList {
  display: grid;
}

.offer {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.offer + .offer {
  border-top: 1px solid #e6ede8;
}

.offerHeading {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.offerHeading h4 {
  font-size: 1rem;
  line-height: 1.35;
}

.exchange {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.termCard {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #e1e9e3;
  border-radius: 16px;
  background: #fbfdfb;
}

.termCard span {
  color: #607066;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.termCard strong {
  color: #1d2b21;
  font-size: 0.92rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.exchangeArrow {
  display: inline-flex;
  align-items: center;
  color: #0a8f47;
  font-weight: 800;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta span {
  padding: 6px 9px;
  border-radius: 999px;
  background: #f0f5f1;
  color: #46564b;
  font-size: 0.75rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.actions form {
  display: inline-flex;
  margin: 0;
}

.detailLink {
  margin-left: auto;
  color: #08763c;
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}

.detailLink:hover,
.detailLink:focus-visible {
  text-decoration: underline;
}

.truthNote {
  margin: 0;
  color: #66736b;
  font-size: 0.78rem;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .groupHeader,
  .offerHeading {
    align-items: flex-start;
  }

  .groupHeader,
  .offerHeading,
  .exchange {
    grid-template-columns: 1fr;
  }

  .groupHeader,
  .offerHeading {
    flex-direction: column;
  }

  .exchange {
    display: grid;
  }

  .exchangeArrow {
    justify-content: center;
    min-height: 18px;
    transform: rotate(90deg);
  }

  .detailLink {
    width: 100%;
    margin-left: 0;
    padding-top: 4px;
  }
}
''',
        encoding="utf-8",
    )


def write_question_form() -> None:
    action_path = ROOT / "src/app/offer-question-actions.ts"
    action_path.write_text(
        '''"use server";

import { revalidatePath } from "next/cache";

import { addOfferCommentAction } from "@/app/actions";

export async function addOfferQuestionAction(formData: FormData) {
  const offerId = String(formData.get("offer_id") ?? "").trim();
  const fallbackReturnTo = offerId ? `/offers/${offerId}#discussion` : "/offers";
  const requestedReturnTo = String(formData.get("return_to") ?? fallbackReturnTo).trim();
  const returnUrl = new URL(
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : fallbackReturnTo,
    "https://www.moraltrade.org",
  );

  returnUrl.searchParams.set("question_posted", String(Date.now()));
  returnUrl.hash = "discussion";
  formData.set("submission_kind", "question");
  formData.set(
    "return_to",
    `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`,
  );

  if (offerId) revalidatePath(`/offers/${offerId}`);
  return addOfferCommentAction(formData);
}
''',
        encoding="utf-8",
    )

    component_path = ROOT / "src/components/marketplace/offer-question-form.tsx"
    component_path.write_text(
        '''"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { addOfferQuestionAction } from "@/app/offer-question-actions";

interface OfferQuestionFormProps {
  offerId: string;
  resetToken?: string;
  returnTo: string;
}

function QuestionSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className="button button-primary"
      disabled={pending}
      type="submit"
    >
      {pending ? "Posting question…" : "Post public question"}
    </button>
  );
}

export function OfferQuestionForm({
  offerId,
  resetToken = "",
  returnTo,
}: OfferQuestionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetToken) formRef.current?.reset();
  }, [resetToken]);

  return (
    <form
      action={addOfferQuestionAction}
      className="stack-form comment-compose-form"
      ref={formRef}
    >
      <input name="offer_id" type="hidden" value={offerId} />
      <input name="return_to" type="hidden" value={returnTo} />
      <label className="field">
        <span>Ask a public question</span>
        <textarea
          name="body"
          placeholder="For example: What receipt or review would count as sufficient evidence?"
          required
          rows={4}
        />
      </label>
      <div aria-live="polite" className="form-actions">
        <QuestionSubmitButton />
      </div>
    </form>
  );
}
''',
        encoding="utf-8",
    )


def patch_offers_page() -> None:
    source = OFFERS_PAGE.read_text(encoding="utf-8")
    source = replace_once(
        source,
        'import { SmartQueryForm } from "@/components/search/smart-query-form";\n',
        'import { ParticipantOfferGroup } from "@/components/marketplace/participant-offer-group";\n'
        'import { SmartQueryForm } from "@/components/search/smart-query-form";\n',
        "participant group component import",
    )
    source = replace_once(
        source,
        'import { formatMode } from "@/lib/offers";\n',
        'import { groupOffersByParticipant } from "@/lib/marketplace-participant-groups";\n',
        "marketplace helper import",
    )

    loader_marker = '''async function listLiveOffers({
'''
    saved_loader = '''async function listSavedOfferIds(viewerId: string | null, offerIds: readonly string[]) {
  if (!viewerId || !offerIds.length || !hasSupabaseEnv()) return new Set<string>();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offer_carts")
    .select("offer_id")
    .eq("user_id", viewerId)
    .in("offer_id", [...offerIds]);

  if (error) {
    console.error("[offers] Failed to load saved-offer state for participant groups", {
      code: error.code,
      message: error.message,
      viewerId,
    });
    return new Set<string>();
  }

  return new Set((data ?? []).map((row) => row.offer_id));
}

'''
    source = replace_once(source, loader_marker, saved_loader + loader_marker, "saved-offer loader insertion")

    source = replace_between(
        source,
        "function LiveProposalCard({ offer }: { offer: OfferRow }) {",
        "export default async function OffersPage",
        "export default async function OffersPage",
        "legacy one-card-per-offer component",
    )

    old_load = '''  const livePage = await listLiveOffers({
    facets,
    interpretation: parsedInterpretation,
    mode,
    page,
    personalPriorities,
    smartSearch,
    sort,
  });
  const isAuthenticated = Boolean(viewer);
'''
    new_load = '''  const livePage = await listLiveOffers({
    facets,
    interpretation: parsedInterpretation,
    mode,
    page,
    personalPriorities,
    smartSearch,
    sort,
  });
  const isAuthenticated = Boolean(viewer);
  const participantGroups = groupOffersByParticipant(livePage.items);
  const savedOfferIds = await listSavedOfferIds(
    viewer?.authUser.id ?? null,
    livePage.items.map((offer) => offer.id),
  );
'''
    source = replace_once(source, old_load, new_load, "directory data preparation")

    old_page_count = '''  const pageCount = Math.max(1, Math.ceil(livePage.total / livePage.pageSize));
'''
    new_page_count = '''  const pageCount = Math.max(1, Math.ceil(livePage.total / livePage.pageSize));
  const currentReturnTo = buildLiveHref({ facets, mode, page, search, sort });
'''
    source = replace_once(source, old_page_count, new_page_count, "current directory return path")

    source = replace_once(
        source,
        '''              {livePage.total.toLocaleString()} live proposal{livePage.total === 1 ? "" : "s"} in the
              current result set. Open a record to review its complete terms and evidence state.
''',
        '''              {participantGroups.length.toLocaleString()} participant{participantGroups.length === 1 ? "" : "s"}
               across {livePage.items.length.toLocaleString()} exact proposal{livePage.items.length === 1 ? "" : "s"}
               on this page; {livePage.total.toLocaleString()} proposal{livePage.total === 1 ? "" : "s"} match the full result set.
''',
        "participant-level result summary",
    )

    old_render = '''                {livePage.items.map((offer) => <LiveProposalCard key={offer.id} offer={offer} />)}
'''
    new_render = '''                {participantGroups.map((group) => (
                  <ParticipantOfferGroup
                    currentReturnTo={currentReturnTo}
                    isAuthenticated={isAuthenticated}
                    key={group.ownerId}
                    offers={group.offers}
                    participantName={group.participantName}
                    savedOfferIds={savedOfferIds}
                    viewerId={viewer?.authUser.id ?? null}
                  />
                ))}
'''
    source = replace_once(source, old_render, new_render, "participant-level directory rendering")
    OFFERS_PAGE.write_text(source, encoding="utf-8")


def patch_question_flow() -> None:
    source = OFFER_DETAIL.read_text(encoding="utf-8")
    source = replace_once(
        source,
        '''  acceptGuestInterestAction,
  acceptInterestAction,
  addOfferCommentAction,
  addOfferRecommendationAction,
''',
        '''  acceptGuestInterestAction,
  acceptInterestAction,
  addOfferRecommendationAction,
''',
        "offer detail comment action import removal",
    )
    source = replace_once(
        source,
        'import { MarketplaceBottomNav,\n',
        'import { OfferQuestionForm } from "@/components/marketplace/offer-question-form";\n'
        'import { MarketplaceBottomNav,\n',
        "question form component import",
    )

    old_message = '''  const formMessage = getFormMessage(resolvedSearchParams);
'''
    new_message = '''  const formMessage = getFormMessage(resolvedSearchParams);
  const questionResetToken = Array.isArray(resolvedSearchParams.question_posted)
    ? resolvedSearchParams.question_posted[0] ?? ""
    : resolvedSearchParams.question_posted ?? "";
'''
    source = replace_once(source, old_message, new_message, "question reset token")

    discussion_start = '''        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Public comments</p>
            <h2>Structured discussion</h2>
            <p>
              Each offer has a public comment thread. Comments can be nested, voted on once per
              user, and linked back to public member profiles.
            </p>
          </div>

          {viewer ? (
            <form action={addOfferCommentAction} className="stack-form comment-compose-form">
              <input name="offer_id" type="hidden" value={offer.id} />
              <input name="return_to" type="hidden" value={`/offers/${offer.id}`} />
              <label className="field">
                <span>Add a public comment</span>
                <textarea
                  name="body"
                  placeholder="State a clarifying question, objection, or supporting premise."
                  rows={4}
                />
              </label>
              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  Post comment
                </button>
              </div>
            </form>
          ) : (
            <div className="status-banner status-banner-success">
              Log in to comment, reply, or vote on comments.
            </div>
          )}

'''
    discussion_replacement = '''        <section
          aria-labelledby="discussion-heading"
          className="section section-subtle"
          id="discussion"
        >
          <div className="section-head">
            <p className="eyebrow">Questions and discussion</p>
            <h2 id="discussion-heading">Clarify the exact proposal before responding.</h2>
            <p>
              Ask about evidence, the no-trade baseline, timing, limits, or externalities. Questions
              and replies remain public and linked to member profiles.
            </p>
          </div>

          {viewer ? (
            <OfferQuestionForm
              offerId={offer.id}
              resetToken={questionResetToken}
              returnTo={`/offers/${offer.id}`}
            />
          ) : (
            <div className="status-banner status-banner-success">
              Log in to ask, reply, or vote on public questions.
            </div>
          )}

'''
    source = replace_once(source, discussion_start, discussion_replacement, "offer question compose section")
    OFFER_DETAIL.write_text(source, encoding="utf-8")

    comments = COMMENT_THREAD.read_text(encoding="utf-8")
    comments = replace_once(
        comments,
        '''          <strong>No public comments yet.</strong>
          <p>Use comments for clarifications, objections, and structured follow-up.</p>
''',
        '''          <strong>No public questions or comments yet.</strong>
          <p>Ask for a missing premise, evidence standard, boundary, or clarification.</p>
''',
        "discussion empty state",
    )
    COMMENT_THREAD.write_text(comments, encoding="utf-8")


def patch_actions() -> None:
    source = ACTIONS.read_text(encoding="utf-8")

    member_start = source.index(
        '  const { error: acceptError } = await supabase\n    .from("interests")',
        source.index("export async function acceptInterestAction"),
    )
    member_end = source.index(
        '\n\n  if (offer.mode === "pledge" && (offererPerformanceBond || takerPerformanceBond)) {',
        member_start,
    )
    member_replacement = '''  const { data: acceptanceResult, error: acceptanceError } = await (supabase as any).rpc(
    "accept_marketplace_interest_v1",
    {
      p_interest_id: interestId,
      p_offer_id: offerId,
      p_notes: notes,
    },
  );

  const acceptancePayload = acceptanceResult as
    | { agreement?: AgreementRow; created?: boolean }
    | null;
  const agreement = acceptancePayload?.agreement;

  if (acceptanceError || !agreement) {
    logSupabaseActionError(
      "Failed to atomically accept interest and create agreement",
      acceptanceError,
      {
        offerId,
        interestId,
        proposerId: viewer.authUser.id,
        responderId: interest.user_id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      acceptanceError?.message ?? "Unable to accept interest and create agreement.",
    );
  }'''
    source = source[:member_start] + member_replacement + source[member_end:]

    guest_start = source.index(
        '  const { error: acceptError } = await supabase\n    .from("guest_interests")',
        source.index("export async function acceptGuestInterestAction"),
    )
    guest_end = source.index('\n\n  if (offer.mode === "offset") {', guest_start)
    guest_replacement = '''  const { data: acceptanceResult, error: acceptanceError } = await (supabase as any).rpc(
    "accept_marketplace_guest_interest_v1",
    {
      p_guest_interest_id: guestInterestId,
      p_offer_id: offerId,
      p_notes: notes,
    },
  );

  const acceptancePayload = acceptanceResult as
    | { agreement?: AgreementRow; created?: boolean }
    | null;

  if (acceptanceError || !acceptancePayload?.agreement) {
    logSupabaseActionError(
      "Failed to atomically accept guest response and create agreement",
      acceptanceError,
      {
        offerId,
        guestInterestId,
        proposerId: viewer.authUser.id,
        responderId: guestInterest.claimed_by_profile_id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      acceptanceError?.message ??
        "Unable to accept the guest response and create an agreement.",
    );
  }'''
    source = source[:guest_start] + guest_replacement + source[guest_end:]

    comment_start = source.index("export async function addOfferCommentAction")
    comment_end = source.index("export async function voteCommentAction", comment_start)
    comment_block = source[comment_start:comment_end]
    comment_block = replace_once(
        comment_block,
        '  redirectWithMessage(returnTo, "message", "Comment posted.");\n',
        '''  const successMessage =
    readOptional(formData, "submission_kind") === "question"
      ? "Question posted."
      : "Comment posted.";
  redirectWithMessage(returnTo, "message", successMessage);
''',
        "comment success message",
    )
    source = source[:comment_start] + comment_block + source[comment_end:]

    ACTIONS.write_text(source, encoding="utf-8")


def write_migration() -> None:
    source_path, confirm_function = extract_latest_function("confirm_agreement_version_v2")
    old_eligibility = "if not found or not moral_trade_private.offer_is_invitable(offer_row.id) then"
    new_eligibility = '''if not found or (
    not moral_trade_private.offer_is_invitable(offer_row.id)
    and not (
      offer_row.status::text = 'matched'
      and offer_row.workflow_status = 'closed'
      and offer_row.closed_at is not null
      and agreement_row.lifecycle_status = 'proposed'
      and (
        exists (
          select 1
          from public.interests accepted_interest
          where accepted_interest.id = agreement_row.interest_id
            and accepted_interest.offer_id = agreement_row.offer_id
            and accepted_interest.user_id = agreement_row.responder_id
            and accepted_interest.status::text = 'accepted'
        )
        or (
          agreement_row.interest_id is null
          and exists (
            select 1
            from public.guest_interests accepted_guest
            where accepted_guest.offer_id = agreement_row.offer_id
              and accepted_guest.claimed_by_profile_id = agreement_row.responder_id
              and accepted_guest.status::text = 'accepted'
          )
        )
      )
    )
  ) then'''
    confirm_function = replace_once(
        confirm_function,
        old_eligibility,
        new_eligibility,
        f"closed-offer confirmation condition from {source_path.name}",
    )
    confirm_function = replace_once(
        confirm_function,
        "    closed_at = now(),\n",
        "    closed_at = coalesce(closed_at, now()),\n",
        "preserved offer closure timestamp",
    )

    atomic_sql = r'''-- Narrow marketplace integrity delta for the existing core-trade schema.
-- This migration deliberately does not add a second evidence/review state machine.

create or replace function public.accept_marketplace_interest_v1(
  p_interest_id uuid,
  p_offer_id uuid,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  actor_id uuid := auth.uid();
  offer_row public.offers%rowtype;
  interest_row public.interests%rowtype;
  existing_agreement public.agreements%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_id_value uuid;
  normalized_notes text := btrim(coalesce(p_notes, ''));
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'A signed-in offer owner is required.';
  end if;
  if p_interest_id is null or p_offer_id is null then
    raise exception using errcode = '22023', message = 'Interest ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;
  if offer_row.owner_id <> actor_id then
    raise exception using errcode = '42501', message = 'Only the offer owner can accept interest.';
  end if;

  select * into interest_row
  from public.interests
  where id = p_interest_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Interest not found.';
  end if;
  if interest_row.offer_id <> offer_row.id then
    raise exception using errcode = '23514', message = 'That interest is not attached to this offer.';
  end if;
  if interest_row.user_id = actor_id then
    raise exception using errcode = '23514', message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where interest_id = interest_row.id
  limit 1;
  if existing_agreement.id is not null then
    if existing_agreement.offer_id is distinct from offer_row.id
       or existing_agreement.proposer_id is distinct from actor_id
       or existing_agreement.responder_id is distinct from interest_row.user_id then
      raise exception using errcode = '23514', message = 'The existing agreement does not match this response.';
    end if;
    return jsonb_build_object('agreement', to_jsonb(existing_agreement), 'created', false);
  end if;

  if offer_row.status::text <> 'open' or offer_row.workflow_status <> 'published' then
    raise exception using errcode = '23514', message = 'This offer is not open for acceptance.';
  end if;
  if interest_row.status::text <> 'pending' then
    raise exception using errcode = '23514', message = 'Only a pending response can be accepted.';
  end if;
  if offer_row.mode::text = 'offset' and exists (
    select 1 from public.donation_offset_offers offset_offer
    where offset_offer.offer_id = offer_row.id
      and offset_offer.participation_mode = 'pool'
  ) then
    raise exception using errcode = '23514', message = 'Pool commitments cannot be accepted one-to-one.';
  end if;

  update public.interests
  set status = 'accepted', updated_at = now()
  where id = interest_row.id;

  perform set_config('app.core_trade_linking_agreement', '1', true);
  perform set_config('app.core_trade_internal', '1', true);

  insert into public.agreements(
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    lifecycle_status,
    notes,
    evidence_due_at,
    created_at,
    updated_at
  ) values (
    offer_row.id,
    interest_row.id,
    actor_id,
    interest_row.user_id,
    'proposed',
    'proposed',
    normalized_notes,
    offer_row.evidence_due_date,
    now(),
    now()
  ) returning id into agreement_id_value;

  perform set_config('app.core_trade_linking_agreement', '', true);
  perform set_config('app.core_trade_internal', '', true);

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> interest_row.id
    and status::text = 'pending';

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status::text = 'pending';

  update public.offers
  set status = 'matched', workflow_status = 'closed', closed_at = now(), updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;
  if agreement_row.id is null or agreement_row.current_version_id is null then
    raise exception 'The agreement could not be linked to one frozen version.';
  end if;

  return jsonb_build_object('agreement', to_jsonb(agreement_row), 'created', true);
end;
$function$;

comment on function public.accept_marketplace_interest_v1(uuid, uuid, text) is
  'Atomically accepts one signed-in response, creates one proposed core agreement and frozen version, declines competing responses, and removes a non-repeatable offer from public inventory. Any failure rolls back every mutation in this function and its synchronous triggers.';
revoke all on function public.accept_marketplace_interest_v1(uuid, uuid, text) from public, anon;
grant execute on function public.accept_marketplace_interest_v1(uuid, uuid, text) to authenticated;

create or replace function public.accept_marketplace_guest_interest_v1(
  p_guest_interest_id uuid,
  p_offer_id uuid,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  actor_id uuid := auth.uid();
  offer_row public.offers%rowtype;
  guest_interest_row public.guest_interests%rowtype;
  existing_agreement public.agreements%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_id_value uuid;
  normalized_notes text := btrim(coalesce(p_notes, ''));
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'A signed-in offer owner is required.';
  end if;
  if p_guest_interest_id is null or p_offer_id is null then
    raise exception using errcode = '22023', message = 'Guest response ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;
  if offer_row.owner_id <> actor_id then
    raise exception using errcode = '42501', message = 'Only the offer owner can accept responses.';
  end if;

  select * into guest_interest_row
  from public.guest_interests
  where id = p_guest_interest_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Guest response not found.';
  end if;
  if guest_interest_row.offer_id <> offer_row.id then
    raise exception using errcode = '23514', message = 'That guest response is not attached to this offer.';
  end if;
  if guest_interest_row.claimed_by_profile_id is null then
    raise exception using errcode = '23514', message = 'The guest respondent must claim the response with an account first.';
  end if;
  if guest_interest_row.claimed_by_profile_id = actor_id then
    raise exception using errcode = '23514', message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where offer_id = offer_row.id
    and proposer_id = actor_id
    and responder_id = guest_interest_row.claimed_by_profile_id
  order by created_at asc
  limit 1;
  if existing_agreement.id is not null then
    return jsonb_build_object('agreement', to_jsonb(existing_agreement), 'created', false);
  end if;

  if offer_row.status::text <> 'open' or offer_row.workflow_status <> 'published' then
    raise exception using errcode = '23514', message = 'This offer is not open for acceptance.';
  end if;
  if guest_interest_row.status::text <> 'pending' then
    raise exception using errcode = '23514', message = 'Only a pending guest response can be accepted.';
  end if;
  if offer_row.mode::text = 'offset' and exists (
    select 1 from public.donation_offset_offers offset_offer
    where offset_offer.offer_id = offer_row.id
      and offset_offer.participation_mode = 'pool'
  ) then
    raise exception using errcode = '23514', message = 'Pool commitments cannot be accepted one-to-one.';
  end if;
  if offer_row.mode::text = 'pledge' and exists (
    select 1 from public.performance_bonds bond
    where bond.offer_id = offer_row.id
      and bond.side = 'offerer'
      and bond.enabled is true
      and bond.status not in ('not_enabled', 'cancelled', 'expired', 'refunded')
  ) then
    raise exception using errcode = '23514', message = 'Bonded pledge swaps require a signed-in member response.';
  end if;

  update public.guest_interests
  set status = 'accepted', updated_at = now()
  where id = guest_interest_row.id;

  perform set_config('app.core_trade_linking_agreement', '1', true);
  perform set_config('app.core_trade_internal', '1', true);

  insert into public.agreements(
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    lifecycle_status,
    notes,
    evidence_due_at,
    created_at,
    updated_at
  ) values (
    offer_row.id,
    null,
    actor_id,
    guest_interest_row.claimed_by_profile_id,
    'proposed',
    'proposed',
    normalized_notes,
    offer_row.evidence_due_date,
    now(),
    now()
  ) returning id into agreement_id_value;

  perform set_config('app.core_trade_linking_agreement', '', true);
  perform set_config('app.core_trade_internal', '', true);

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> guest_interest_row.id
    and status::text = 'pending';

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status::text = 'pending';

  update public.offers
  set status = 'matched', workflow_status = 'closed', closed_at = now(), updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;
  if agreement_row.id is null or agreement_row.current_version_id is null then
    raise exception 'The agreement could not be linked to one frozen version.';
  end if;

  return jsonb_build_object('agreement', to_jsonb(agreement_row), 'created', true);
end;
$function$;

comment on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) is
  'Atomically accepts one claimed guest response, creates one proposed core agreement and frozen version, declines competing responses, and removes a non-repeatable offer from public inventory. Any failure rolls back every mutation in this function and its synchronous triggers.';
revoke all on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) from public, anon;
grant execute on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) to authenticated;

'''

    migration = (
        atomic_sql
        + "-- Preserve the canonical agreement confirmation path while allowing the exact accepted\n"
        + "-- response-backed proposed agreement to confirm after atomic acceptance closes its source offer.\n\n"
        + confirm_function
        + "\n\ncomment on function public.confirm_agreement_version_v2(uuid, uuid, uuid) is\n"
        + "  'Records one participant confirmation for the exact current frozen version. A proposed agreement created from an accepted member or claimed-guest response remains confirmable after its source offer is matched and closed.';\n\n"
        + "notify pgrst, 'reload schema';\n"
    )
    MIGRATION_PATH.write_text(migration, encoding="utf-8")


def write_sql_regression() -> None:
    path = ROOT / "supabase/tests/marketplace_atomic_acceptance_current_core.sql"
    path.write_text(
        r'''-- Transaction-local regression against the exact MoralTrade QA fixture.
-- No test mutation survives the final rollback.

begin;
set local statement_timeout = '45s';
set local lock_timeout = '10s';

DO $guard$
declare
  owner_profile_id uuid;
  responder_profile_id uuid;
  fixture_count integer;
begin
  select id into owner_profile_id from public.profiles where email='qa-market-owner@example.com';
  select id into responder_profile_id from public.profiles where email='qa-market-responder@example.com';
  select count(*) into fixture_count
  from public.offers
  where id='10000000-0000-4000-8000-000000000158'::uuid
    and fingerprint='qa-pr-158-marketplace-fixture-v1'
    and owner_id=owner_profile_id;
  if owner_profile_id is null or responder_profile_id is null or fixture_count <> 1 then
    raise exception 'Refusing marketplace delta regression outside the exact MoralTrade QA fixture.';
  end if;
end;
$guard$;

-- Transaction-local clean baseline.
delete from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;

insert into public.interests(id, offer_id, user_id, interested_alias, message, status)
values (
  '10000000-0000-4000-8000-000000000170'::uuid,
  '10000000-0000-4000-8000-000000000158'::uuid,
  (select id from public.profiles where email='qa-market-responder@example.com'),
  'QA Counterparty',
  '[marketplace delta regression] member response',
  'pending'
);

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email='qa-market-owner@example.com'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select id::text from public.profiles where email='qa-market-owner@example.com'),
    'role', 'authenticated'
  )::text,
  true
);

create or replace function public.qa_force_marketplace_delta_agreement_failure()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if new.notes='qa-marketplace-delta-forced-failure' then
    raise exception 'qa_marketplace_delta_forced_failure';
  end if;
  return new;
end;
$function$;

create trigger qa_force_marketplace_delta_agreement_failure_trigger
before insert on public.agreements
for each row execute function public.qa_force_marketplace_delta_agreement_failure();

DO $failure_case$
begin
  begin
    perform public.accept_marketplace_interest_v1(
      '10000000-0000-4000-8000-000000000170'::uuid,
      '10000000-0000-4000-8000-000000000158'::uuid,
      'qa-marketplace-delta-forced-failure'
    );
    raise exception 'Expected the forced agreement insert failure.';
  exception when others then
    if sqlerrm <> 'qa_marketplace_delta_forced_failure' then raise; end if;
  end;
end;
$failure_case$;

DO $failure_assertions$
declare
  response_status text;
  offer_status text;
  offer_workflow text;
  agreement_count integer;
begin
  select status::text into response_status from public.interests
  where id='10000000-0000-4000-8000-000000000170'::uuid;
  select status::text, workflow_status into offer_status, offer_workflow from public.offers
  where id='10000000-0000-4000-8000-000000000158'::uuid;
  select count(*) into agreement_count from public.agreements
  where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
  if response_status <> 'pending' or offer_status <> 'open' or offer_workflow <> 'published' or agreement_count <> 0 then
    raise exception 'Failed creation must roll back response, offer, and agreement state. response %, offer %/%, agreements %.',
      response_status, offer_status, offer_workflow, agreement_count;
  end if;
end;
$failure_assertions$;

drop trigger qa_force_marketplace_delta_agreement_failure_trigger on public.agreements;
drop function public.qa_force_marketplace_delta_agreement_failure();

DO $member_success$
declare
  owner_profile_id uuid := (select id from public.profiles where email='qa-market-owner@example.com');
  responder_profile_id uuid := (select id from public.profiles where email='qa-market-responder@example.com');
  result jsonb;
  agreement_id_value uuid;
  version_id_value uuid;
  lifecycle text;
  thread_count integer;
  offer_status text;
  offer_workflow text;
  confirmation jsonb;
  confirmation_count integer;
begin
  result := public.accept_marketplace_interest_v1(
    '10000000-0000-4000-8000-000000000170'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    'member atomic success'
  );
  agreement_id_value := (result->'agreement'->>'id')::uuid;
  select current_version_id, lifecycle_status into version_id_value, lifecycle
  from public.agreements where id=agreement_id_value;
  select count(*) into thread_count from public.trade_threads
  where offer_id='10000000-0000-4000-8000-000000000158'::uuid
    and agreement_id=agreement_id_value;
  select status::text, workflow_status into offer_status, offer_workflow from public.offers
  where id='10000000-0000-4000-8000-000000000158'::uuid;
  if agreement_id_value is null or version_id_value is null or lifecycle <> 'proposed'
     or thread_count <> 1 or offer_status <> 'matched' or offer_workflow <> 'closed' then
    raise exception 'Member acceptance did not create one proposed versioned agreement and linked thread before closing the offer.';
  end if;

  confirmation := public.confirm_agreement_version_v2(owner_profile_id, agreement_id_value, version_id_value);
  if coalesce((confirmation->>'active')::boolean, true) then
    raise exception 'First confirmation must not activate.';
  end if;
  confirmation := public.confirm_agreement_version_v2(owner_profile_id, agreement_id_value, version_id_value);
  select count(distinct user_id) into confirmation_count from public.trade_agreement_confirmations
  where agreement_version_id=version_id_value;
  if coalesce((confirmation->>'active')::boolean, true) or confirmation_count <> 1 then
    raise exception 'Duplicate confirmation by one participant must remain idempotent.';
  end if;
  confirmation := public.confirm_agreement_version_v2(responder_profile_id, agreement_id_value, version_id_value);
  if not coalesce((confirmation->>'active')::boolean, false) then
    raise exception 'Second distinct confirmation must activate the frozen version.';
  end if;
end;
$member_success$;

-- Reset inside the same outer transaction and exercise claimed-guest acceptance.
delete from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;

insert into public.guest_interests(
  id, offer_id, contact_email, display_name, message, status, claimed_by_profile_id
) values (
  '10000000-0000-4000-8000-000000000171'::uuid,
  '10000000-0000-4000-8000-000000000158'::uuid,
  'qa-market-responder@example.com',
  'QA Counterparty',
  '[marketplace delta regression] claimed guest response',
  'pending',
  (select id from public.profiles where email='qa-market-responder@example.com')
);

DO $guest_success$
declare
  result jsonb;
  agreement_id_value uuid;
  version_id_value uuid;
  lifecycle text;
  thread_count integer;
begin
  result := public.accept_marketplace_guest_interest_v1(
    '10000000-0000-4000-8000-000000000171'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    'claimed guest atomic success'
  );
  agreement_id_value := (result->'agreement'->>'id')::uuid;
  select current_version_id, lifecycle_status into version_id_value, lifecycle
  from public.agreements where id=agreement_id_value;
  select count(*) into thread_count from public.trade_threads
  where offer_id='10000000-0000-4000-8000-000000000158'::uuid
    and agreement_id=agreement_id_value;
  if agreement_id_value is null or version_id_value is null or lifecycle <> 'proposed' or thread_count <> 1 then
    raise exception 'Claimed-guest acceptance did not create one proposed versioned agreement and linked thread.';
  end if;
end;
$guest_success$;

select 'PASS: member and claimed-guest acceptance are atomic on the existing core-trade schema' as result;
rollback;
''',
        encoding="utf-8",
    )


def write_source_contract_test() -> None:
    path = ROOT / "src/lib/marketplace-delta-contract.test.ts"
    path.write_text(
        '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const actions = readFileSync(path.join(root, "src/app/actions.ts"), "utf8");
const offersPage = readFileSync(path.join(root, "src/app/offers/page.tsx"), "utf8");
const offerDetail = readFileSync(path.join(root, "src/app/offers/[offerId]/page.tsx"), "utf8");
const participantGroup = readFileSync(
  path.join(root, "src/components/marketplace/participant-offer-group.tsx"),
  "utf8",
);
const questionForm = readFileSync(
  path.join(root, "src/components/marketplace/offer-question-form.tsx"),
  "utf8",
);
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260729170000_marketplace_atomic_acceptance_current_core.sql"),
  "utf8",
);

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("member and guest acceptance call atomic database boundaries", () => {
  const member = between(
    actions,
    "export async function acceptInterestAction",
    "export async function acceptGuestInterestAction",
  );
  const guest = between(
    actions,
    "export async function acceptGuestInterestAction",
    "export async function rateAgreementAction",
  );

  assert.match(member, /accept_marketplace_interest_v1/);
  assert.match(guest, /accept_marketplace_guest_interest_v1/);
  assert.doesNotMatch(member, /\.from\("interests"\)[\s\S]*?status:\s*"accepted"/);
  assert.doesNotMatch(guest, /\.from\("guest_interests"\)[\s\S]*?status:\s*"accepted"/);
});

test("migration aligns with the existing core-trade schema rather than adding a second one", () => {
  assert.match(migration, /trade_agreement_versions/);
  assert.match(migration, /trade_agreement_confirmations/);
  assert.match(migration, /offer_row\.status::text = 'matched'/);
  assert.match(migration, /accepted_interest\.status::text = 'accepted'/);
  assert.match(migration, /accepted_guest\.status::text = 'accepted'/);
  assert.doesNotMatch(migration, /completion_state/);
  assert.doesNotMatch(migration, /agreement_evidence_items/);
  assert.doesNotMatch(migration, /agreement_review_cases/);
});

test("directory groups exact proposals and exposes exact-offer actions", () => {
  assert.match(offersPage, /groupOffersByParticipant/);
  assert.match(offersPage, /ParticipantOfferGroup/);
  assert.doesNotMatch(offersPage, /LiveProposalCard/);
  assert.match(participantGroup, /Exact published proposal/);
  assert.match(participantGroup, /source_offer=\$\{offer\.id\}/);
  assert.match(participantGroup, /name="offer_id"[\s\S]*value=\{offer\.id\}/);
  assert.match(participantGroup, /These are the owner&apos;s exact published terms/);
});

test("question form has pending state, explicit success type, and success reset", () => {
  assert.match(questionForm, /useFormStatus/);
  assert.match(questionForm, /Posting question…/);
  assert.match(questionForm, /formRef\.current\?\.reset/);
  assert.match(offerDetail, /OfferQuestionForm/);
  assert.match(offerDetail, /id="discussion"/);
  assert.match(actions, /Question posted\./);
});

test("candidate keeps the canonical message and trade-agreement architecture", () => {
  const candidateSources = [actions, offersPage, offerDetail, participantGroup, questionForm].join("\n");
  assert.match(participantGroup, /\/offers\/new\?mode=\$\{offer\.mode\}&source_offer=\$\{offer\.id\}/);
  assert.doesNotMatch(candidateSources, /\/deals\//);
  assert.doesNotMatch(candidateSources, /dealroom-main-sections/);
});
''',
        encoding="utf-8",
    )


def main() -> None:
    write_audit()
    write_grouping_helper()
    write_participant_component()
    write_question_form()
    patch_offers_page()
    patch_question_flow()
    patch_actions()
    write_migration()
    write_sql_regression()
    write_source_contract_test()
    print("Materialized the narrow marketplace delta against current main.")


if __name__ == "__main__":
    main()
