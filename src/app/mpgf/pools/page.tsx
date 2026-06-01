import type { Metadata } from "next";
import Link from "next/link";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoAlternatives, demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import {
  allocateMpgfAssuranceRound,
  formatUsd,
  getMpgfCampaignAssuranceStatus,
} from "@/lib/mpgf/mechanism";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import {
  MPGF_PUBLIC_GOODS_MORAL_CLUSTER_OPTIONS,
  buildMpgfPublicGoodsCommonGroundDiscovery,
  isMpgfPublicGoodsMoralCluster,
  type MpgfPublicGoodsMoralCluster,
} from "@/lib/mpgf/public-goods-cg-vqaf";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Pools",
  description: "Approved demo ordinary-pool alternatives for the Moral Public Goods Fund.",
  alternates: {
    canonical: "/mpgf/pools",
  },
  openGraph: {
    title: "MPGF Pools",
    description: "Approved demo ordinary-pool alternatives for the Moral Public Goods Fund.",
    url: getAbsoluteUrl("/mpgf/pools"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

type PoolKindFilter = "all" | "consensus" | "hybrid";
type PoolSortMode = "common_ground" | "default" | "preference" | "reliability";

interface MpgfPoolsPageProps {
  searchParams?: Promise<{
    kind?: string | string[];
    sort?: string | string[];
    cluster?: string | string[];
    min_intensity?: string | string[];
  }>;
}

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeKindFilter(value: string | string[] | undefined): PoolKindFilter {
  const normalized = readSearchValue(value);

  return normalized === "consensus" || normalized === "hybrid" ? normalized : "all";
}

function normalizeSortMode(value: string | string[] | undefined): PoolSortMode {
  const normalized = readSearchValue(value);

  return normalized === "default" || normalized === "preference" || normalized === "reliability"
    ? normalized
    : "common_ground";
}

function normalizeMoralCluster(value: string | string[] | undefined): MpgfPublicGoodsMoralCluster {
  const normalized = readSearchValue(value);

  return isMpgfPublicGoodsMoralCluster(normalized) ? normalized : "institutional_pluralist";
}

function normalizeMinimumIntensity(value: string | string[] | undefined) {
  const parsed = Number(readSearchValue(value) ?? 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(10_000, Math.round(parsed)));
}

function formatBasisPoints(value: number) {
  return `${(value / 100).toFixed(0)}%`;
}

function getGoodTypeLabel(alternative: (typeof demoAlternatives)[number]) {
  if (alternative.isConsensus && alternative.isHybrid) {
    return "Consensus + hybrid";
  }

  return alternative.isConsensus ? "Consensus" : "Hybrid";
}

export default async function MpgfPoolsPage({ searchParams }: MpgfPoolsPageProps) {
  const resolvedSearchParams = await searchParams;
  const kindFilter = normalizeKindFilter(resolvedSearchParams?.kind);
  const sortMode = normalizeSortMode(resolvedSearchParams?.sort);
  const moralCluster = normalizeMoralCluster(resolvedSearchParams?.cluster);
  const minimumIntensity = normalizeMinimumIntensity(resolvedSearchParams?.min_intensity);
  const commonGroundDiscovery = buildMpgfPublicGoodsCommonGroundDiscovery({ moralCluster });
  const commonGroundByCampaignId = new Map(
    commonGroundDiscovery.rows.map((row, index) => [row.campaignId, { ...row, order: index }]),
  );
  const visibleAlternatives = demoAlternatives
    .filter((alternative) => {
      if (kindFilter === "consensus") {
        return alternative.isConsensus;
      }

      if (kindFilter === "hybrid") {
        return alternative.isHybrid;
      }

      return true;
    })
    .filter((alternative) => alternative.demoPriorityBps >= minimumIntensity)
    .sort((left, right) => {
      if (sortMode === "common_ground") {
        const leftCampaign = demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.poolAlternativeId === left.id);
        const rightCampaign = demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.poolAlternativeId === right.id);
        const leftDiscovery = leftCampaign ? commonGroundByCampaignId.get(leftCampaign.id) : null;
        const rightDiscovery = rightCampaign ? commonGroundByCampaignId.get(rightCampaign.id) : null;

        return (
          (leftDiscovery?.order ?? Number.MAX_SAFE_INTEGER) -
            (rightDiscovery?.order ?? Number.MAX_SAFE_INTEGER) ||
          left.id.localeCompare(right.id)
        );
      }

      if (sortMode === "preference") {
        return right.demoPriorityBps - left.demoPriorityBps || left.id.localeCompare(right.id);
      }

      if (sortMode === "reliability") {
        return right.operationalReliabilityBps - left.operationalReliabilityBps || left.id.localeCompare(right.id);
      }

      return left.id.localeCompare(right.id);
    });
  const viewer = await getViewer();
  const participantState = await loadMpgfParticipantState({
    userId: viewer?.authUser.id,
    displayName: viewer?.displayName,
  });
  const assuranceAllocation = allocateMpgfAssuranceRound();
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/pools/new">Draft pool proposal</Link>}
      description="These visible demo alternatives satisfy the production direct-working requirement without real-money effects."
      title="Approved demo ordinary-pool alternatives."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <form className="mpgf-panel stack-form" action="/mpgf/pools">
        <div className="section-head auth-head">
          <p className="eyebrow">Consensus and hybrid goods</p>
          <h2>Filter demo pools by common-ground coordination signals</h2>
          <p>
            Consensus goods are framed as shared coordination targets. Hybrid goods can attract
            support from different moral views for different reasons. These filters affect only the
            demo directory and do not authorize allocation or payout.
          </p>
        </div>
        <div className="field-grid">
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
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
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
          <button className="button button-secondary" type="submit">
            Apply filters
          </button>
          <Link className="button button-secondary" href="/mpgf/pools">
            Reset
          </Link>
        </div>
      </form>

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
            <dd>
              {MPGF_PUBLIC_GOODS_MORAL_CLUSTER_OPTIONS.find((option) => option.value === moralCluster)?.label}
            </dd>
          </div>
          <div>
            <dt>Experiment</dt>
            <dd>common-ground personalization</dd>
          </div>
          <div>
            <dt>Ranking boundary</dt>
            <dd>coordinatability only</dd>
          </div>
          <div>
            <dt>Privacy</dt>
            <dd>aggregate scores only</dd>
          </div>
        </dl>
      </section>

      <section className="mpgf-pool-directory">
        {visibleAlternatives.map((alternative) => {
          const campaign = demoMpgfPublicGoodsCampaigns.find((candidate) => candidate.poolAlternativeId === alternative.id);
          const status = campaign ? getMpgfCampaignAssuranceStatus(campaign) : null;
          const line = campaign
            ? assuranceAllocation.lines.find((candidate) => candidate.campaignId === campaign.id)
            : null;
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
                  <span className="badge badge-secondary" title={discovery.reasonCodes.join(", ")}>
                    Common-ground {formatBasisPoints(discovery.coordinatabilityScoreBps)}
                  </span>
                ) : null}
                {status ? <span className="badge badge-secondary">{status.status.replaceAll("_", " ")}</span> : null}
              </div>
              <p>{alternative.description}</p>
              <p>{alternative.moralPublicGoodRationale}</p>
              {campaign && status ? (
                <dl className="mpgf-summary-grid">
                  <div>
                    <dt>Verified direct</dt>
                    <dd>{formatUsd(line?.directEligibleCents ?? status.directEligibleCents)}</dd>
                  </div>
                  <div>
                    <dt>Verified supporters</dt>
                    <dd>
                      {status.verifiedSupporterCount}/{campaign.thresholdSupporters}
                    </dd>
                  </div>
                  <div>
                    <dt>Base unlock</dt>
                    <dd>{formatUsd(line?.baseMatchCents ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Bonus range</dt>
                    <dd>{formatUsd(line?.qfBonusCents ?? 0)}</dd>
                  </div>
                </dl>
              ) : null}
              {discovery ? (
                <p className="mpgf-small">
                  Discovery basis: {discovery.reasonCodes.map((code) => code.replaceAll("_", " ")).join(", ")}.
                </p>
              ) : null}
              <Link className="inline-link" href={`/mpgf/pools/${alternative.id}`}>View pool</Link>
            </article>
          );
        })}
        {visibleAlternatives.length === 0 ? (
          <article className="mpgf-panel">
            <p className="eyebrow">No matching demo pools</p>
            <h2>Try a broader filter.</h2>
            <p>
              The current filter only affects the public demo directory. It does not change MPGF
              allocation logic or create a personal funding instruction.
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
