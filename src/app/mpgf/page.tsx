import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { MpgfRoundBoard } from "@/components/mpgf/mpgf-round-board";
import { getViewer } from "@/lib/app-data";
import {
  demoAlternatives,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  MPGF_COPY,
} from "@/lib/mpgf/data";
import {
  allocateMpgfAssuranceRound,
  buildPublicSummary,
  computeExactMpgfAllocation,
  formatUsd,
  summarizeMpgfAssuranceRound,
} from "@/lib/mpgf/mechanism";
import { buildMpgfRoundBoardCards } from "@/lib/mpgf/public-goods-round-board";
import {
  MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE,
  evaluateMpgfPivotalityCalculator,
} from "@/lib/mpgf/public-goods-pivotality";
import { buildMpgfPublicGoodsEcmRulebookReport } from "@/lib/mpgf/public-goods-ecm-rulebook";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

const MPGF_SHARED_FUTURE_SENTENCE =
  "It might not be necessary for everyone to have the same values, or agree on philosophical questions, to get a future which most views think is pretty great.";
const MPGF_COORDINATION_FUTURE_SENTENCE =
  "By coordinating to fund moral public goods, we could still get a mostly-great future even if people only broadly agree on what's valuable and even if most people are mostly self-interested.";
const MPGF_SELF_INTEREST_SENTENCE =
  "With this coordination mechanism, it's in people's best self-interest to fund moral public goods.";

export const metadata: Metadata = {
  title: "Common Ground Budget | Public Goods Fund",
  description:
    "Preview the Moral Trade moral public goods path for moral public goods, evidence review, demo candidate pools, allocation process, and technical notes.",
  alternates: {
    canonical: "/mpgf",
  },
  openGraph: {
    title: "Common Ground Budget | Public Goods Fund",
    description:
      "Preview the moral public goods path for shared moral public goods before any binding contribution.",
    url: getAbsoluteUrl("/mpgf"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfPage() {
  const viewer = await getViewer();
  const allocation = computeExactMpgfAllocation();
  const publicSummary = buildPublicSummary({ allocation });
  const assuranceAllocation = allocateMpgfAssuranceRound();
  const assuranceSummary = summarizeMpgfAssuranceRound(assuranceAllocation);
  const roundBoardCards = buildMpgfRoundBoardCards({
    allocation: assuranceAllocation,
    campaigns: demoMpgfPublicGoodsCampaigns,
    viewerPresent: Boolean(viewer),
  });
  const roundBoardCardByCampaignId = new Map(roundBoardCards.map((card) => [card.campaignId, card]));
  const pivotalityExample = evaluateMpgfPivotalityCalculator({
    calculatorSurface: "advanced_explainer",
    contributionCents: 5_000,
    thresholdCents: 50_000,
    valueRatio: "0.20",
    pSuccessWithoutMe: "0.30",
    userEstimatedPDecisive: "0.25",
    signerOnlyRewardValue: "0",
    nonDecisiveExtraFundingValueFraction: "0",
  });
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();
  const rulebookReport = buildMpgfPublicGoodsEcmRulebookReport();
  const roundHref = `/mpgf/rounds/${demoMpgfAssuranceRound.id}`;
  const previewBudgetHref = `${roundHref}#common-ground-budget-preview`;

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href={previewBudgetHref}>
            Preview a Common Ground Budget
          </Link>
          <Link className="button button-secondary" href={roundHref}>
            View current round
          </Link>
          <Link className="button button-secondary" href="#how-it-works">
            Learn how it works / View audit and rules
          </Link>
        </>
      }
      description="One budget. Pick projects. Funding happens only if enough different-view support joins and review gates pass. Coordinate around moral public goods without treating preview, match, reward, credit, or certificate estimates as live capture."
      eyebrow="Public Goods Fund"
      title="Common Ground Budget"
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <nav className="hub-tabs" aria-label="Public Goods Fund sections">
        <a href="#overview">Overview</a>
        <a href="#why-this-matters">Why this matters</a>
        <a href="#why-this-is-hard">Why this is hard</a>
        <a href="#what-this-pilot-tests">What this pilot tests</a>
        <a href="#how-it-works">How it works</a>
        <a href="#round-board">Round board</a>
        <a href="#assurance-matching">CRECM matching</a>
        <a href="#advanced-pivotality-calculator">Pivotality calculator</a>
        <Link href={roundHref}>Public round</Link>
        <Link href="/mpgf/governance">Governance</Link>
        <Link href="/mpgf/metrics">Funding metrics</Link>
        <a href="#trust-and-review">Trust and review</a>
        <a href="#evidence-review">Evidence review</a>
        <a href="#candidate-pools">Candidate pools</a>
        <a href="#allocation-process">Allocation process</a>
        <a href="#audit-and-advanced-details">Audit details</a>
      </nav>

      <section className="mpgf-kpi-grid" aria-label="Common Ground Budget status strip">
        <div className="mpgf-kpi">
          <span>No charge now</span>
          <strong>Preview only</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Authorization path</span>
          <strong>JIT after gates</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Progress visibility</span>
          <strong>Sealed before close</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Sponsor pools</span>
          <strong>{assuranceSummary.sponsorPoolCents > 0 ? "Backed" : "Not backed"}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Review state</span>
          <strong>{manualEvidenceReadiness.ready ? "Open" : "Persistence check"}</strong>
        </div>
      </section>

      <section className="section section-white" id="overview">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Overview</p>
          <h2>One budget for overlapping moral reasons</h2>
          <p>
            The Moral Public Goods Fund, or MPGF, is the mechanism name. Public pages use Public
            Goods Fund so newcomers can understand the purpose before the acronym. Coordinate
            around moral public goods first, then inspect technical
            details below.
          </p>
        </div>
        <div className="concept-grid">
          <article className="panel concept-card">
            <h3>Consensus goods</h3>
            <p>{MPGF_COPY.moralPublicGoods}</p>
          </article>
          <article className="panel concept-card">
            <h3>Identity and authorization before counting</h3>
            <p>
              The primary flow records a pledge intent, verifies identity, authorizes payment
              conditionally, and falls back to manual evidence only when provider integration is
              unavailable.
            </p>
          </article>
          <article className="panel concept-card">
            <h3>Legal posture</h3>
            <p>
              {MPGF_COPY.not_escrow} {MPGF_COPY.not_tax_advice}
            </p>
          </article>
        </div>
      </section>

      <section className="section section-subtle" id="how-it-works">
        <div className="section-head section-head-compact">
          <p className="eyebrow">How it works</p>
          <h2>Choose, pick, review, then wait for gate-cleared clearing</h2>
          <p>
            The default path is simple mode. Advanced details remain visible, but they are not the
            first decision surface and cannot become binding until the review screen shows them.
          </p>
        </div>
        <div className="step-card-grid">
          <article className="panel step-card">
            <span className="step-index">01</span>
            <h3>Choose your maximum</h3>
            <p>Set moral public goods preferences and a fallback rule without any charge, hold, or custody claim.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">02</span>
            <h3>Pick projects</h3>
            <p>Use plain stance labels: Fund this, Fund if different-view support joins, Needs review, or Skip.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">03</span>
            <h3>Review and save</h3>
            <p>Caps, buckets, fallback, fees, benefits, payment language, and sealed-progress rules are shown before consent.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">04</span>
            <h3>Round clears after gates</h3>
            <p>Threshold, review, challenge, payment, authorization, and sponsor-backing checks must pass before settlement.</p>
          </article>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href={previewBudgetHref}>
            Preview a Common Ground Budget
          </Link>
          <Link className="button button-secondary" href={roundHref}>
            View current round
          </Link>
        </div>
      </section>

      <section className="section section-subtle" id="why-this-matters">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Why this matters</p>
          <h2>Many moral views overlap on some public goods</h2>
          <p>
            People may value global health, animal welfare, existential-risk reduction,
            public-interest knowledge, or climate resilience somewhat, even when they prioritize
            different idiosyncratic goals. {MPGF_SHARED_FUTURE_SENTENCE}{" "}
            {MPGF_COORDINATION_FUTURE_SENTENCE} {MPGF_SELF_INTEREST_SENTENCE} That overlap can
            create gains from coordination.
          </p>
        </div>
        <div className="concept-grid">
          <article className="panel concept-card">
            <h3>Overlapping reasons</h3>
            <p>Participants do not need one shared moral theory to value a public good enough to coordinate.</p>
          </article>
          <article className="panel concept-card">
            <h3>Distributed power</h3>
            <p>Candidate pools, dissent notes, and public review make coordination legible without central moral ranking.</p>
          </article>
          <article className="panel concept-card">
            <h3>Scalable wedge</h3>
            <p>Threshold commitments are easier to review publicly than many private bilateral trades.</p>
          </article>
        </div>
      </section>

      <section className="section section-white" id="why-this-is-hard">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Why this is hard</p>
          <h2>Moral public goods still face a free-rider problem</h2>
          <p>
            Voluntary contracts alone may not solve public-good underprovision. The pilot therefore
            treats public-goods coordination as mechanism research, not proof that a fund exists or
            that all contributions will be counterfactually caused by the site.
          </p>
        </div>
        <div className="concept-grid">
          <article className="panel concept-card">
            <h3>Counterfactual uncertainty</h3>
            <p>External payment evidence shows an action happened, but not always why it happened.</p>
          </article>
          <article className="panel concept-card">
            <h3>Dissent and externalities</h3>
            <p>Some groups may object to candidate pools, measurement choices, or incentive effects.</p>
          </article>
          <article className="panel concept-card">
            <h3>No custody shortcut</h3>
            <p>Non-custodial coordination preserves posture but makes verification and reporting more important.</p>
          </article>
        </div>
      </section>

      <section className="section section-subtle" id="what-this-pilot-tests">
        <div className="section-head section-head-compact">
          <p className="eyebrow">What this pilot tests</p>
          <h2>Threshold commitments before broad marketplace mechanics</h2>
          <p>
            The Fund tests moral public goods, explicit project stances, threshold commitments,
            payment-commitment snapshots, dissent notes, candidate pools, reviewer verification,
            and non-custodial coordination in one public workflow. Its motivating layer is CRECM
            v1.125: pledges count only after amount, supporter, review, payment, and evidence gates
            are satisfied.
          </p>
        </div>
      </section>

      <section className="mpgf-kpi-grid" aria-label="Public Goods Fund sealed summary">
        <div className="mpgf-kpi">
          <span>Sponsor pool</span>
          <strong>{formatUsd(assuranceSummary.sponsorPoolCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Campaign progress</span>
          <strong>Sealed before close</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Bonus allocation</span>
          <strong>Final report only</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Review status</span>
          <strong>{manualEvidenceReadiness.ready ? "Open" : "Persistence check"}</strong>
        </div>
      </section>

      <MpgfRoundBoard
        cards={roundBoardCards}
        roundHref={`/mpgf/rounds/${demoMpgfAssuranceRound.id}`}
        roundName={demoMpgfAssuranceRound.name}
      />

      <section className="section section-white" id="assurance-matching">
        <div className="section-head section-head-compact">
          <p className="eyebrow">CRECM v1.125</p>
          <h2>moral public goods clear only after enough verified cross-view support joins</h2>
          <p>
            {demoMpgfMatchPool.visibleCommitment} The capped diversity-aware bonus is applied only
            to threshold-cleared, review-approved campaigns, so broad support allocates sponsor
            dollars without replacing review, payment-state proof, or destination proof. Exact live
            threshold satisfaction, supporter counts, active-cluster counts, counterparty gaps, and
            success-without-me status stay sealed before close.
          </p>
        </div>
        <div className="mpgf-pool-directory">
          {demoMpgfPublicGoodsCampaigns.map((campaign) => {
            const sealedProgressLabel =
              roundBoardCardByCampaignId.get(campaign.id)?.sealedProgressLabel ?? "Needs more support";

            return (
              <article className="mpgf-panel" key={campaign.id}>
                <p className="eyebrow">Sealed public preview | {sealedProgressLabel}</p>
                <h2>{campaign.title}</h2>
                <p>{campaign.publicSummary}</p>
                <dl className="mpgf-summary-grid" aria-label={`${campaign.title} collective-action metrics`}>
                  <div>
                    <dt>Qualitative progress</dt>
                    <dd>{sealedProgressLabel}</dd>
                  </div>
                  <div>
                    <dt>Public progress</dt>
                    <dd>Sealed before close</dd>
                  </div>
                  <div>
                    <dt>Supporter breadth</dt>
                    <dd>Sealed before close</dd>
                  </div>
                  <div>
                    <dt>Base match unlocked</dt>
                    <dd>Shown after close in final reports</dd>
                  </div>
                  <div>
                    <dt>Estimated bonus range</dt>
                    <dd>Shown after close in final reports</dd>
                  </div>
                </dl>
                <div className="mpgf-allocation-row">
                  <div>
                    <span>Amount threshold</span>
                    <strong>Sealed before close</strong>
                  </div>
                </div>
                <div className="mpgf-allocation-row">
                  <div>
                    <span>Supporter threshold</span>
                    <strong>Sealed before close</strong>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="badge badge-secondary">
                    Deadline {new Date(campaign.deadlineAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="badge badge-secondary">{campaign.destinationType.replaceAll("_", " ")}</span>
                </div>
                <Link className="inline-link" href={`/mpgf/pools/${campaign.slug}`}>
                  View public proof path
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mpgf-small">
          Round:{" "}
          <Link className="inline-link" href={roundHref}>
            {demoMpgfAssuranceRound.name}
          </Link>
          . Demo budget for the older ballot allocation remains{" "}
          {formatUsd(publicSummary.budgetCents)} and external payouts remain {formatUsd(publicSummary.externallyPaidCents)}.
        </p>
      </section>

      <section className="section section-subtle" id="advanced-pivotality-calculator">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Advanced explainer</p>
          <h2>Advanced: Pivotality Calculator</h2>
          <p>{MPGF_PUBLIC_GOODS_PIVOTALITY_ISOLATION_NOTICE}</p>
        </div>
        <div className="concept-grid">
          <article className="panel concept-card">
            <h3>Example output</h3>
            <dl className="mpgf-summary-grid" aria-label="Advanced pivotality calculator example">
              <div>
                <dt>Your possible contribution</dt>
                <dd>{formatUsd(5_000)}</dd>
              </div>
              <div>
                <dt>Funding threshold</dt>
                <dd>{formatUsd(50_000)}</dd>
              </div>
              <div>
                <dt>Required decisive probability</dt>
                <dd>{pivotalityExample.requiredPDecisivePercent ?? "impossible"}</dd>
              </div>
              <div>
                <dt>Your estimate</dt>
                <dd>{pivotalityExample.userEstimatedPDecisivePercent}</dd>
              </div>
            </dl>
            <p>{pivotalityExample.interpretation}</p>
          </article>
          <form
            action="/api/mpgf/pivotality-calculator"
            aria-label="Advanced pivotality calculator"
            className="panel stacked-form"
            method="post"
          >
            <input name="calculatorSurface" type="hidden" value="advanced_explainer" />
            <label className="field">
              <span>Your possible contribution, x</span>
              <input min="1" name="contributionCents" type="number" defaultValue={5000} />
            </label>
            <label className="field">
              <span>Funding threshold, T</span>
              <input min="1" name="thresholdCents" type="number" defaultValue={50000} />
            </label>
            <label className="field">
              <span>Value ratio, r</span>
              <input inputMode="decimal" name="valueRatio" type="text" defaultValue="0.20" />
            </label>
            <label className="field">
              <span>Probability the project succeeds without you, p0</span>
              <input inputMode="decimal" name="pSuccessWithoutMe" type="text" defaultValue="0.30" />
            </label>
            <label className="field">
              <span>Your estimated probability your pledge is decisive, pD</span>
              <input inputMode="decimal" name="userEstimatedPDecisive" type="text" defaultValue="0.25" />
            </label>
            <label className="field">
              <span>Signer-only reward value, s</span>
              <input inputMode="decimal" name="signerOnlyRewardValue" type="text" defaultValue="0" />
            </label>
            <label className="field">
              <span>Non-decisive extra-funding value fraction, h</span>
              <input
                inputMode="decimal"
                name="nonDecisiveExtraFundingValueFraction"
                type="text"
                defaultValue="0"
              />
            </label>
            <button className="button button-secondary" type="submit">
              Calculate from subjective inputs
            </button>
          </form>
          <article className="panel concept-card">
            <h3>Boundary</h3>
            <p>
              Results use only the values entered here. Success rewards can be modeled only as an
              entered subjective value and are treated as up to unless the maximum liability is
              fully backed.
            </p>
          </article>
        </div>
      </section>

      <section className="section section-subtle" id="trust-and-review">
        <div className="section-head">
          <p className="eyebrow">Trust and review</p>
          <h2>Review gates and no-escrow-unless-true language stay visible</h2>
          <p>
            The hub keeps anti-threat review, externality review, challenges, appeals, and payment
            honesty close to the default flow. It does not imply escrow, custody, guaranteed match,
            or payment protection unless the recorded legal and provider state supports that claim.
          </p>
        </div>
        <div className="concept-grid">
          <article className="panel concept-card">
            <h3>Review gates</h3>
            <p>Projects need threshold, evidence, destination, challenge, anti-threat, and externality checks before clearing.</p>
          </article>
          <article className="panel concept-card">
            <h3>Challenge and appeal</h3>
            <p>Open challenges block or qualify clearing until reviewers mark them clear or non-blocking.</p>
          </article>
          <article className="panel concept-card">
            <h3>No escrow unless true</h3>
            <p>Preview copy says no charge now, and authorization or custody language depends on actual provider/legal state.</p>
          </article>
        </div>
        <div className="hero-actions">
          <Link className="button button-secondary" href="/mpgf/governance">
            Governance and rules
          </Link>
          <Link className="button button-secondary" href="/mpgf/real-money-terms">
            Real-money terms
          </Link>
          <Link className="button button-secondary" href="/mpgf/technical-spec">
            Audit details
          </Link>
        </div>
      </section>

      <section className="section section-subtle" id="evidence-review">
        <div className="section-head">
          <p className="eyebrow">Evidence and payment review path</p>
          <h2>Contribution intents start with identity and conditional authorization</h2>
          <p>
            Signed-in participants can create a pledge intent, verify identity, and authorize a
            provider-managed payment that captures only after threshold, review, and challenge gates.
            Manual evidence remains available when provider integrations are unavailable.
          </p>
        </div>

        <div className="concept-grid">
          <article className="panel concept-card">
            <h3>Pledge intent</h3>
            <p>
              Participants choose a campaign, amount, visibility setting, and fallback rule before
              any contribution can count.
            </p>
          </article>
          <article className="panel concept-card">
            <h3>Provider events</h3>
            <p>
              Stripe webhook records can support provider-approved flows when real-money mode is
              configured. The public pilot still treats provider data as review evidence rather
              than a promise of custody or legal escrow.
            </p>
          </article>
          <article className="panel concept-card">
            <h3>Participant controls</h3>
            <p>
              Signed-out visitors can inspect the workflow, but contribution intents, identity
              checks, payment authorization, and manual evidence records require sign-in.
            </p>
          </article>
        </div>
      </section>

      <section className="section section-white" id="participation">
        <div className="section-head">
          <p className="eyebrow">How participation works</p>
          <h2>Verify identity, authorize conditionally, then wait for review</h2>
          <p>
            The public hub explains the workflow without embedding the full submission console.
            Signed-in participants use the dedicated contribution page to create contribution
            intents or submit manual evidence when provider authorization is unavailable.
          </p>
        </div>
        <div className="step-card-grid">
          <article className="panel step-card">
            <span className="step-index">01</span>
            <h3>Create a pledge intent</h3>
            <p>Select the campaign, amount, visibility preference, and manual fallback rule.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">02</span>
            <h3>Verify identity and authorize payment</h3>
            <p>Identity checks and conditional provider authorization happen before threshold counting.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">03</span>
            <h3>Reviewers count it only after gates clear</h3>
            <p>Threshold, review, provider event, and challenge gates must pass before capture or counting.</p>
          </article>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href="/mpgf/contribute">
            Review contribution controls
          </Link>
          <Link className="button button-secondary" href="/mpgf/account/contributions">
            View contribution state
          </Link>
        </div>
      </section>

      <section className="section section-white" id="candidate-pools">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Candidate pools</p>
          <h2>Demo pools are clearly marked as demo pools</h2>
          <p>
            These alternatives are non-real-money examples used to show how candidate public goods
            can be described before any live allocation or payout workflow exists.
          </p>
        </div>
        <div className="data-grid">
          {demoAlternatives.slice(0, 4).map((alternative) => (
            <article className="panel data-card" key={alternative.id}>
              <p className="detail-kicker">Demo pool | {alternative.causeArea}</p>
              <h3>{alternative.name}</h3>
              <p className="route-text">{alternative.description}</p>
              <div className="tag-row">
                <span className="badge badge-secondary">
                  {alternative.isConsensus ? "Consensus good" : "Hybrid good"}
                </span>
                <span className="badge badge-secondary">Review state: demo only</span>
              </div>
              <dl className="listing-terms">
                <div>
                  <dt>Amount verified</dt>
                  <dd>{formatUsd(0)}</dd>
                </div>
                <div>
                  <dt>Amount pending</dt>
                  <dd>{formatUsd(0)}</dd>
                </div>
              </dl>
              <Link className="text-button" href="/mpgf/pools">
                Inspect pool
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-subtle" id="allocation-process">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Allocation process</p>
          <h2>Two-stage review before any public reliance</h2>
          <p>
            The pilot separates evidence review from allocation review. Evidence records must be
            accepted before they count, and demo allocation records remain internal plans rather
            than disbursement, custody, or effectiveness guarantees.
          </p>
        </div>
        <div className="step-card-grid">
          <article className="panel step-card">
            <span className="step-index">01</span>
            <h3>Evidence review</h3>
            <p>Check external destination, amount, reference, payment date, and supporting evidence.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">02</span>
            <h3>Allocation review</h3>
            <p>Review candidate pools, demo reasoning, dissent notes, and published technical records.</p>
          </article>
        </div>
      </section>

      <section className="section section-white" id="audit-and-advanced-details">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Audit and advanced details</p>
          <h2>Rulebook, sponsor pools, proof paths, and technical records stay below the default decision surface</h2>
          <p>
            Technical records remain available for auditors and mechanism reviewers without making
            them the first thing a new visitor has to parse.
          </p>
        </div>
        <dl className="mpgf-summary-grid" aria-label="Public Goods Fund audit and advanced details">
          <div>
            <dt>Rulebook hash</dt>
            <dd>{rulebookReport.calcHash}</dd>
          </div>
          <div>
            <dt>Calculation version</dt>
            <dd>{rulebookReport.clearingContract.policy}</dd>
          </div>
          <div>
            <dt>Mechanism label</dt>
            <dd>{rulebookReport.mechanism.technicalLabel}</dd>
          </div>
          <div>
            <dt>New mechanism</dt>
            <dd>{rulebookReport.mechanism.fullTechnicalLabel}</dd>
          </div>
          <div>
            <dt>Legacy/demo label</dt>
            <dd>
              <span className="badge badge-secondary">
                {rulebookReport.mechanism.legacyMechanismLabelBadge}
              </span>{" "}
              {rulebookReport.mechanism.legacyMechanismLabel}
            </dd>
          </div>
          <div>
            <dt>Source rulebook</dt>
            <dd>{rulebookReport.mechanism.sourceSpec}</dd>
          </div>
          <div>
            <dt>Sponsor pools</dt>
            <dd>{rulebookReport.sponsorPoolBacking.poolTypes.join(", ")}</dd>
          </div>
          <div>
            <dt>Proof path</dt>
            <dd>Review gates, payment snapshots, clearing bundle, and public audit bundle after close</dd>
          </div>
          <div>
            <dt>Candidate pools</dt>
            <dd>{demoMpgfPublicGoodsCampaigns.length} current demo candidates, kept separate from live offers</dd>
          </div>
          <div>
            <dt>Technical spec</dt>
            <dd>Detailed CRECM v1.125 predicates, hashes, failure handling, and accounting channels</dd>
          </div>
        </dl>
        <div className="hero-actions">
          <Link className="button button-secondary" href="/mpgf/technical-spec">
            Technical spec
          </Link>
          <Link className="button button-secondary" href="/mpgf/pools">
            Candidate pools
          </Link>
          <Link className="button button-secondary" href="/mpgf/pools">
            Proof path
          </Link>
          <Link className="button button-secondary" href="/priority-correction-fund">
            Priority Correction Fund
          </Link>
        </div>
      </section>
    </MpgfPageFrame>
  );
}
