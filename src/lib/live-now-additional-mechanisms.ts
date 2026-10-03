import type { LiveNowOfferCandidate } from "./live-now-recommendations";

interface ConditionalRedirectRow {
  id: string;
  creator_profile_id: string;
  creator_amount_cents: number;
  matcher_amount_cents: number;
  currency: string;
  fallback_destination_id: string;
  matched_destination_id: string;
  deadline_at: string;
  status: string;
  terms_version: number;
  created_at: string;
  updated_at: string;
}

interface PublicGoodsProposalRow {
  id: string;
  proposer_id: string;
  title: string;
  summary: string;
  cause_area: string;
  problem: string;
  intervention: string;
  proposed_recipient_name: string;
  requested_maximum_funding_cents: number;
  minimum_viable_funding_cents: number | null;
  outcome_units_summary: string;
  expected_effect_vs_funding: string;
  timeline: string;
  status: string;
  public_goods_threshold_amount_cents: number | null;
  public_goods_threshold_supporters: number | null;
  public_goods_deadline_at: string | null;
  public_goods_verification_method: string | null;
  public_goods_baseline_rule: string | null;
  public_goods_exit_rule: string | null;
  public_goods_failure_bonus_enabled: boolean;
  created_at: string;
  submitted_at: string | null;
}

export interface AdditionalMechanismInventory {
  candidates: LiveNowOfferCandidate[];
  counts: {
    donation_upgrades: number;
    moral_public_goods_pools: number;
  };
  errors: string[];
}

function dollars(cents: number | null | undefined) {
  const value = Math.max(0, Number(cents) || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 100 === 0 ? 0 : 2,
  }).format(value / 100);
}

function daysUntil(value: string | null, now: Date) {
  if (!value) return null;
  const deadline = Date.parse(value);
  if (!Number.isFinite(deadline)) return null;
  return Math.max(0, Math.ceil((deadline - now.getTime()) / 86_400_000));
}

export async function loadAdditionalPublicMechanisms({
  service,
  profileId,
  now = new Date(),
}: {
  service: any;
  profileId: string;
  now?: Date;
}): Promise<AdditionalMechanismInventory> {
  const errors: string[] = [];
  const candidates: LiveNowOfferCandidate[] = [];
  const nowIso = now.toISOString();
  const [upgradeResult, publicGoodsResult] = await Promise.all([
    service
      .from("conditional_redirect_offers")
      .select(
        "id,creator_profile_id,creator_amount_cents,matcher_amount_cents,currency,fallback_destination_id,matched_destination_id,deadline_at,status,terms_version,created_at,updated_at",
      )
      .eq("status", "open")
      .eq("livemode", true)
      .gt("deadline_at", nowIso)
      .neq("creator_profile_id", profileId)
      .order("updated_at", { ascending: false })
      .limit(250),
    service
      .from("mpgf_pool_proposals")
      .select(
        "id,proposer_id,title,summary,cause_area,problem,intervention,proposed_recipient_name,requested_maximum_funding_cents,minimum_viable_funding_cents,outcome_units_summary,expected_effect_vs_funding,timeline,status,public_goods_threshold_amount_cents,public_goods_threshold_supporters,public_goods_deadline_at,public_goods_verification_method,public_goods_baseline_rule,public_goods_exit_rule,public_goods_failure_bonus_enabled,created_at,submitted_at",
      )
      .eq("status", "approved_as_candidate")
      .not("public_goods_threshold_amount_cents", "is", null)
      .or(`public_goods_deadline_at.is.null,public_goods_deadline_at.gt.${nowIso}`)
      .neq("proposer_id", profileId)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(250),
  ]);

  if (upgradeResult.error) errors.push(`donation_upgrades:${upgradeResult.error.message}`);
  else {
    for (const row of (upgradeResult.data ?? []) as ConditionalRedirectRow[]) {
      const total = (Number(row.creator_amount_cents) || 0) + (Number(row.matcher_amount_cents) || 0);
      candidates.push({
        id: row.id,
        ownerId: row.creator_profile_id,
        ownerAlias: "Donation Upgrade creator",
        mode: "offset",
        offeredCause: "Donation Upgrade",
        requestedCause: "Match a conditional donation redirect",
        compromiseCause: "Higher-impact matched donation",
        offerAction: `${dollars(total)} is redirected to the matched destination if the condition is satisfied; otherwise the creator's authorized fallback applies.`,
        requestAction: `Authorize the ${dollars(row.matcher_amount_cents)} matching side before the deadline.`,
        verification: "Settlement follows the frozen conditional-redirect terms and payment authorization ledger.",
        duration: `Deadline ${row.deadline_at.slice(0, 10)}`,
        trustLevel: 3,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        opportunityType: "donation_redirect",
        href: `/donation-upgrades/${encodeURIComponent(row.id)}`,
        ctaLabel: "Review Donation Upgrade",
        sourceLabel: "Donation Upgrade",
        summary: `Fallback ${row.fallback_destination_id} · matched destination ${row.matched_destination_id}`,
        benefitCauses: ["Effective giving", "Donation impact"],
        actionCauses: ["Conditional donation", "Matching funds"],
        metadata: {
          durationDays: daysUntil(row.deadline_at, now),
          privacyLevel: "public-safe",
          invitationBacked: false,
          termsVersion: row.terms_version,
          mechanism: "donation_upgrade",
        },
      });
    }
  }

  if (publicGoodsResult.error) errors.push(`moral_public_goods:${publicGoodsResult.error.message}`);
  else {
    for (const row of (publicGoodsResult.data ?? []) as PublicGoodsProposalRow[]) {
      const threshold = Number(row.public_goods_threshold_amount_cents) || 0;
      const supporters = Number(row.public_goods_threshold_supporters) || 0;
      candidates.push({
        id: row.id,
        ownerId: row.proposer_id,
        ownerAlias: "Moral public-goods pool",
        mode: "pledge",
        offeredCause: row.cause_area || row.title || "Moral public good",
        requestedCause: "Conditional pledge to a shared threshold",
        compromiseCause: row.cause_area || "Shared moral public good",
        offerAction: row.intervention || row.summary || row.problem,
        requestAction: `Pledge toward the ${dollars(threshold)} threshold${supporters ? ` with ${supporters} supporters required` : ""}.`,
        verification: row.public_goods_verification_method || "Use the pool's frozen verification method.",
        duration: row.public_goods_deadline_at
          ? `Threshold deadline ${row.public_goods_deadline_at.slice(0, 10)}`
          : row.timeline || "Open while the approved candidate remains live",
        trustLevel: 3,
        createdAt: row.created_at,
        updatedAt: row.submitted_at || row.created_at,
        opportunityType: "donation_pool",
        href: `/mpgf?proposal=${encodeURIComponent(row.id)}`,
        ctaLabel: "Review public-goods pool",
        sourceLabel: row.public_goods_failure_bonus_enabled
          ? "Dominant assurance pool"
          : "Threshold public-goods pool",
        summary: row.summary || `${row.problem} ${row.expected_effect_vs_funding}`,
        benefitCauses: [row.cause_area, row.title, row.outcome_units_summary].filter(Boolean),
        actionCauses: ["Conditional pledge", "Public-goods coordination"],
        metadata: {
          assuranceMinimumCents: threshold,
          durationDays: daysUntil(row.public_goods_deadline_at, now),
          destinationName: row.proposed_recipient_name,
          minimumViableFundingCents: row.minimum_viable_funding_cents,
          privacyLevel: "public-safe",
          invitationBacked: false,
          noTradeBaseline: row.public_goods_baseline_rule,
          exitRule: row.public_goods_exit_rule,
          mechanism: row.public_goods_failure_bonus_enabled
            ? "dominant_assurance_contract"
            : "threshold_pool",
        },
      });
    }
  }

  return {
    candidates,
    counts: {
      donation_upgrades: upgradeResult.error ? 0 : (upgradeResult.data ?? []).length,
      moral_public_goods_pools: publicGoodsResult.error ? 0 : (publicGoodsResult.data ?? []).length,
    },
    errors,
  };
}
