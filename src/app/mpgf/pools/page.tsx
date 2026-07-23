import type { Metadata } from "next";
import Link from "next/link";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { SmartQueryForm } from "@/components/search/smart-query-form";
import { getViewer } from "@/lib/app-data";
import {
  demoAlternatives,
  demoCycle,
  demoMpgfPublicGoodsCampaigns,
} from "@/lib/mpgf/data";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import {
  MPGF_PUBLIC_GOODS_MORAL_CLUSTER_OPTIONS,
  buildMpgfPublicGoodsCommonGroundDiscovery,
  isMpgfPublicGoodsMoralCluster,
  type MpgfPublicGoodsMoralCluster,
} from "@/lib/mpgf/public-goods-cg-vqaf";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";
import { smartDiscoveryScore } from "@/lib/smart-discovery-ranking";
import {
  getSmartDeadlineUrgency,
  getSmartQueryCauseLabel,
  matchesSmartAmountConstraint,
  matchesSmartDeadlineConstraint,
  matchesSmartVerificationConstraint,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
  type SmartQueryFacets,
} from "@/lib/smart-query";
import {
  hasSmartQueryConstraints,
  mergeSmartQueryFacets,
} from "@/lib/smart-query-facets";
import { loadSmartQueryCausePriorities } from "@/lib/smart-query-personalization";
import {
  smartCauseMatchScore,
  smartInterpretationScore,
  smartPersonalPriorityScore,
} from "@/lib/smart-query-scoring";

export const metadata: Metadata = {
  title: "MPGF Pools",
  description: "Approved demo ordinary-pool alternatives for the Moral Public Goods Fund.",
  alternates: { canonical: "/mpgf/pools" },
  openGraph: {
    title: "MPGF Pools",
    description: "Approved demo ordinary-pool alternatives for the Moral Public Goods Fund.",
    url: getAbsoluteUrl("/mpgf/pools"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

type PoolKindFilter = "all" | "consensus" | "hybrid";
type PoolSortMode = "best_match" | "common_ground" | "default" | "preference" | "reliability";
type DemoAlternative = (typeof demoAlternatives)[number];

interface MpgfPoolsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

interface RankedAlternative {
  alternative: DemoAlternative;
  commonGroundOrder: number;
  commonGroundScore: number;
  evidenceQuality: number;
  score: number;
  semanticRelevance: number;
}

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  return readSearchValue(searchParams?.[key]) ?? "";
}

function normalizeKindFilter(value: string | string[] | undefined): PoolKindFilter {
  const normalized = readSearchValue(value);
  return normalized === "consensus" || normalized === "hybrid" ? normalized : "all";
}

function normalizeSortMode(value: string | string[] | undefined): PoolSortMode {
  const normalized = readSearchValue(value);
  return normalized === "common_ground" ||
    normalized === "default" ||
    normalized === "preference" ||
    normalized === "reliability" ||
    normalized === "best_match"
    ? normalized
    : "best_match";
}

function normalizeMoralCluster(value: string | string[] | undefined): MpgfPublicGoodsMoralCluster {
  const normalized = readSearchValue(value);
  return isMpgfPublicGoodsMoralCluster(normalized) ? normalized : "institutional_pluralist";
}

function normalizeMinimumIntensity(value: string | string[] | undefined) {
  const parsed = Number(readSearchValue(value) ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10_000, Math.round(parsed))) : 0;
}

function formatBasisPoints(value: number) {
  return `${(value / 100).toFixed(0)}%`;
}

function getGoodTypeLabel(alternative: DemoAlternative) {
  if (alternative.isConsensus && alternative.isHybrid) return "Consensus + hybrid";
  return alternative.isConsensus ? "Consensus" : "Hybrid";
}

function alternativeFields(alternative: DemoAlternative) {
  return [
    { value: alternative.causeArea, weight: 1 },
    { value: `${alternative.name} ${alternative.shortName}`, weight: 0.96 },
    { value: alternative.description, weight: 0.9 },
    { value: alternative.moralPublicGoodRationale, weight: 0.88 },
    { value: `${alternative.outcomeUnit} ${alternative.recipientName}`, weight: 0.7 },
  ] as const;
}

function alternativeCauseIds(alternative: DemoAlternative) {
  return parseSmartQuery(
    `${alternative.causeArea} ${alternative.name} ${alternative.description}`,
    { surface: "mpgf_pools" },
  ).facets.causes;
}

function alternativeMatchesHardConstraints(
  alternative: DemoAlternative,
  facets: SmartQueryFacets,
  kindFilter: PoolKindFilter,
  minimumIntensity: number,
) {
  if (kindFilter === "consensus" && !alternative.isConsensus) return false;
  if (kindFilter === "hybrid" && !alternative.isHybrid) return false;
  if (alternative.demoPriorityBps < minimumIntensity) return false;
  if (facets.poolKinds.includes("consensus") && !alternative.isConsensus) return false;
  if (facets.poolKinds.includes("hybrid") && !alternative.isHybrid) return false;
  if (facets.causes.length && smartCauseMatchScore(facets.causes, alternativeFields(alternative)) < 0.42) {
    return false;
  }
  if (!matchesSmartVerificationConstraint(facets, alternative.status === "approved_demo")) return false;
  if (!matchesSmartAmountConstraint(facets, [demoCycle.budgetCents])) return false;
  if (!matchesSmartDeadlineConstraint(facets, demoCycle.ballotClosesAt)) return false;
  if (facets.actionTypes.length && !facets.actionTypes.includes("pool")) return false;
  if (
    facets.participantKinds.length ||
    facets.openToPayment !== null ||
    facets.openToPledges !== null ||
    facets.minCredit !== null ||
    facets.evidenceStates.length ||
    facets.location
  ) {
    return false;
  }
  return true;
}

function rankAlternatives({
  commonGroundByCampaignId,
  facets,
  kindFilter,
  minimumIntensity,
  personalPriorities,
  query,
  sortMode,
}: {
  commonGroundByCampaignId: Map<string, { order: number; coordinatabilityScoreBps: number }>;
  facets: SmartQueryFacets;
  kindFilter: PoolKindFilter;
  minimumIntensity: number;
  personalPriorities: readonly string[];
  query: string;
  sortMode: PoolSortMode;
}) {
  const parsed = parseSmartQuery(query, { surface: "mpgf_pools" });
  const interpretation = { ...parsed, facets };
  const ranked = demoAlternatives
    .filter((alternative) =>
      alternativeMatchesHardConstraints(alternative, facets, kindFilter, minimumIntensity),
    )
    .map((alternative): RankedAlternative | null => {
      const campaign = demoMpgfPublicGoodsCampaigns.find(
        (candidate) => candidate.poolAlternativeId === alternative.id,
      );
      const commonGround = campaign ? commonGroundByCampaignId.get(campaign.id) : null;
      const semanticRelevance = smartInterpretationScore(
        interpretation,
        alternativeFields(alternative),
      );
      if (
        (interpretation.residualTerms.length || facets.causes.length) &&
        semanticRelevance < 0.16
      ) {
        return null;
      }
      const causeIds = alternativeCauseIds(alternative);
      const evidenceQuality = Math.min(
        1,
        0.55 + 0.45 * (alternative.operationalReliabilityBps / 10_000),
      );
      const score = smartDiscoveryScore({
        semanticRelevance,
        evidenceQuality,
        personalMoralFit: smartPersonalPriorityScore(causeIds, personalPriorities),
        deadlineUrgency: getSmartDeadlineUrgency(demoCycle.ballotClosesAt),
        credit: 0,
      });
      return {
        alternative,
        commonGroundOrder: commonGround?.order ?? Number.MAX_SAFE_INTEGER,
        commonGroundScore: (commonGround?.coordinatabilityScoreBps ?? 0) / 10_000,
        evidenceQuality,
        score,
        semanticRelevance,
      };
    })
    .filter((entry): entry is RankedAlternative => Boolean(entry));

  return ranked
    .sort((left, right) => {
      if (sortMode === "common_ground" || (sortMode === "best_match" && !query && !facets.causes.length)) {
        return left.commonGroundOrder - right.commonGroundOrder ||
          right.commonGroundScore - left.commonGroundScore ||
          left.alternative.id.localeCompare(right.alternative.id);
      }
      if (sortMode === "preference") {
        return right.alternative.demoPriorityBps - left.alternative.demoPriorityBps ||
          right.score - left.score || left.alternative.id.localeCompare(right.alternative.id);
      }
      if (sortMode === "reliability") {
        return right.alternative.operationalReliabilityBps - left.alternative.operationalReliabilityBps ||
          right.score - left.score || left.alternative.id.localeCompare(right.alternative.id);
      }
      if (sortMode === "default") return left.alternative.id.localeCompare(right.alternative.id);
      return right.score - left.score ||
        right.semanticRelevance - left.semanticRelevance ||
        right.commonGroundScore - left.commonGroundScore ||
        left.alternative.id.localeCompare(right.alternative.id);
    })
    .map((entry) => entry.alternative);
}

export default async function MpgfPoolsPage({ searchParams }: MpgfPoolsPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = readParam(resolvedSearchParams, "q").trim().slice(0, 500);
  const parsed = parseSmartQuery(query, { surface: "mpgf_pools" });
  const facets = mergeSmartQueryFacets(
    parsed.facets,
    parseSerializedSmartQueryFacets(resolvedSearchParams ?? {}),
  );
  const kindFilter = normalizeKindFilter(resolvedSearchParams?.kind);
  const sortMode = normalizeSortMode(resolvedSearchParams?.sort ?? facets.sort ?? undefined);
  const moralCluster = normalizeMoralCluster(resolvedSearchParams?.cluster);
  const minimumIntensity = normalizeMinimumIntensity(resolvedSearchParams?.min_intensity);
  const commonGroundDiscovery = buildMpgfPublicGoodsCommonGroundDiscovery({ moralCluster });
  const commonGroundByCampaignId = new Map(
    commonGroundDiscovery.rows.map((row, index) => [
      row.campaignId,
      {
        order: index,
        coordinatabilityScoreBps: row.coordinatabilityScoreBps,
      },
    ]),
  );
  const viewer = await getViewer();
  const personalPriorities = await loadSmartQueryCausePriorities(viewer?.authUser.id);
  const visibleAlternatives = rankAlternatives({
    commonGroundByCampaignId,
    facets,
    kindFilter,
    minimumIntensity,
    personalPriorities,
    query,
    sortMode,
  });
  const participantState = await loadMpgfParticipantState({
    userId: viewer?.authUser.id,
    displayName: viewer?.displayName,
  });
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();
  const hasFilters = Boolean(
    query || kindFilter !== "all" || minimumIntensity || hasSmartQueryConstraints(facets),
  );
  const activeConstraints = [
    ...facets.causes.map((cause) => `Cause: ${getSmartQueryCauseLabel(cause)}`),
    ...facets.poolKinds.map((kind) => `${kind === "consensus" ? "Consensus" : "Hybrid"} good`),
    facets.verified === true ? "Approved demo only" : facets.verified === false ? "Not approved" : null,
    facets.deadlineBefore
      ? `${facets.deadlineBeforeInclusive ? "By" : "Before"} ${facets.deadlineBefore}`
      : null,
    facets.maxAmountCents !== null
      ? `Cycle budget ${facets.maxAmountInclusive ? "≤" : "<"} $${(facets.maxAmountCents / 100).toLocaleString()}`
      : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/pools/new">Draft pool proposal</Link>}
      description="These visible demo alternatives satisfy the production direct-working requirement without real-money effects."
      title="Approved demo ordinary-pool alternatives."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <SmartQueryForm action="/mpgf/pools" className="mpgf-panel stack-form" method="get" queryName="q" surface="mpgf_pools">
        <div className="section-head auth-head">
          <p className="eyebrow">Consensus and hybrid goods</p>
          <h2>Find demo pools by shared goal and coordination signal</h2>
          <p>
            Describe a cause or good in ordinary language. Hard constraints run before semantic fit,
            approved-demo review quality, saved cause priorities, and the current cycle deadline.
            Common-ground ordering remains an explicit coordinatability lens, not a claim about moral truth.
          </p>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>Search demo pools</span>
            <input
              defaultValue={query}
              name="q"
              placeholder="e.g. approved animal-welfare hybrid goods"
              type="search"
            />
          </label>
          <label className="field">
            <span>Good type</span>
            <select defaultValue={kindFilter} name="kind">
              <option value="all">All demo goods</option>
              <option value="consensus">Consensus goods</option>
              <option value="hybrid">Hybrid goods</option>
            </select>
          </label>
          <label className="field">
            <span>Sort by</span>
            <select defaultValue={sortMode} name="sort">
              <option value="best_match">Best match</option>
              <option value="common_ground">Common-ground ordering</option>
              <option value="default">Stable directory order</option>
              <option value="preference">Default preference intensity</option>
              <option value="reliability">Operational reliability</option>
            </select>
          </label>
          <label className="field">
            <span>Common-ground lens</span>
            <select defaultValue={moralCluster} name="cluster">
              {MPGF_PUBLIC_GOODS_MORAL_CLUSTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Minimum preference intensity: {formatBasisPoints(minimumIntensity)}</span>
            <input
              defaultValue={minimumIntensity}
              max={10_000}
              min={0}
              name="min_intensity"
              step={100}
              title="Filters by demo priority basis points, which are example ballot weights rather than claims about true moral value."
              type="range"
            />
          </label>
        </div>
        <div className="form-actions">
          <button className="button button-secondary" type="submit">Apply smart search</button>
          {hasFilters ? <Link className="button button-secondary" href="/mpgf/pools">Reset</Link> : null}
        </div>
        {query || activeConstraints.length ? (
          <div className="tag-row" aria-live="polite">
            {query ? <span className="badge">Query: {query}</span> : null}
            {activeConstraints.map((label) => <span className="badge" key={label}>{label}</span>)}
          </div>
        ) : null}
        <p className="mpgf-small">
          Generic amount and deadline constraints apply to the published demo cycle budget and close,
          because these alternatives do not expose separate live-money targets.
        </p>
      </SmartQueryForm>

      <section className="mpgf-panel mpgf-panel-primary">
        <div className="section-head auth-head">
          <p className="eyebrow">Private common-ground ordering</p>
          <h2>Campaign order ranks coordinatability, not moral truth</h2>
          <p>
            The selected lens uses private-by-default support signals, cross-cluster breadth,
            threshold progress, and reviewability to surface overlapping reasons. It does not create
            a global moral ranking or expose raw support reasons.
          </p>
        </div>
        <dl className="mpgf-summary-grid">
          <div>
            <dt>Lens</dt>
            <dd>{MPGF_PUBLIC_GOODS_MORAL_CLUSTER_OPTIONS.find((option) => option.value === moralCluster)?.label}</dd>
          </div>
          <div><dt>Experiment</dt><dd>common-ground personalization</dd></div>
          <div><dt>Ranking boundary</dt><dd>coordinatability only</dd></div>
          <div><dt>Privacy</dt><dd>aggregate scores only</dd></div>
        </dl>
      </section>

      <section className="mpgf-pool-directory">
        {visibleAlternatives.map((alternative) => {
          const campaign = demoMpgfPublicGoodsCampaigns.find(
            (candidate) => candidate.poolAlternativeId === alternative.id,
          );
          const discovery = campaign ? commonGroundByCampaignId.get(campaign.id) : null;

          return (
            <article key={alternative.id} className="mpgf-panel">
              <p className="eyebrow">{alternative.causeArea}</p>
              <h2>{alternative.name}</h2>
              <div className="tag-row">
                <span className="badge" title={alternative.expectedMoralImpactTooltip}>
                  {getGoodTypeLabel(alternative)} good
                </span>
                <span className="badge badge-secondary" title={alternative.preferenceIntensityHint}>
                  Default intensity {formatBasisPoints(alternative.demoPriorityBps)}
                </span>
                {discovery ? (
                  <span className="badge badge-secondary" title="Common-ground coordinatability under the selected lens">
                    Common-ground {formatBasisPoints(discovery.coordinatabilityScoreBps)}
                  </span>
                ) : null}
                {campaign ? <span className="badge badge-secondary">Sealed progress</span> : null}
              </div>
              <p>{alternative.description}</p>
              <p>{alternative.moralPublicGoodRationale}</p>
              {campaign ? (
                <dl className="mpgf-summary-grid">
                  <div><dt>Public progress</dt><dd>Sealed before close</dd></div>
                  <div><dt>Supporter breadth</dt><dd>Sealed before close</dd></div>
                  <div><dt>Base unlock</dt><dd>Shown after close in final reports</dd></div>
                  <div><dt>Bonus range</dt><dd>Shown after close in final reports</dd></div>
                </dl>
              ) : null}
              {discovery ? (
                <p className="mpgf-small">
                  Discovery basis: {commonGroundDiscovery.rows.find((row) => row.campaignId === campaign?.id)?.reasonCodes
                    .map((code) => code.replaceAll("_", " ")).join(", ")}.
                </p>
              ) : null}
              <Link className="inline-link" href={`/mpgf/pools/${alternative.id}`}>View pool</Link>
            </article>
          );
        })}
        {visibleAlternatives.length === 0 ? (
          <article className="mpgf-panel">
            <p className="eyebrow">No matching demo pools</p>
            <h2>No alternative satisfies every hard constraint.</h2>
            <p>
              Broaden the cause, good type, cycle budget, deadline, or approval requirement. The
              directory never treats missing or private fields as matches.
            </p>
          </article>
        ) : null}
      </section>

      <section className="section section-white">
        <MpgfConsole
          initialTab="pools"
          manualEvidenceReadiness={manualEvidenceReadiness}
          participantState={participantState}
          realMoneyReadiness={realMoneyReadiness}
          viewerPresent={Boolean(viewer)}
        />
      </section>
    </MpgfPageFrame>
  );
}
