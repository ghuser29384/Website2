import Link from "next/link";

import { MpgfDacPledgePanel } from "@/components/mpgf/mpgf-dac-pledge-panel";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  getMpgfDacLifecycleStage,
  isMpgfDacCampaignOpenForPledges,
  type MpgfDacPublicCampaign,
} from "@/lib/mpgf/dac-lifecycle-model";
import { formatUsd } from "@/lib/mpgf/mechanism";

interface MpgfDacCampaignViewProps {
  campaign: MpgfDacPublicCampaign;
  viewerPresent: boolean;
}

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "not recorded";
}

function formatBasisPoints(value: number) {
  return `${(value / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

function exactJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function DateValue({ value }: { value: string }) {
  return (
    <LocalDateTime
      value={value}
      fallback="Date unavailable"
      locale="en-US"
      options={{ day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }}
    />
  );
}

export function MpgfDacCampaignView({ campaign, viewerPresent }: MpgfDacCampaignViewProps) {
  const outcome = campaign.outcome;
  const terms = campaign.publishedTerms;
  const createTerms = terms.createPoolTerms;
  const openForPledges = isMpgfDacCampaignOpenForPledges(campaign);
  const campaignPath = `/mpgf/campaigns/${campaign.slug || campaign.id}`;
  const lifecycleStage = getMpgfDacLifecycleStage({
    proposalStatus: outcome?.status ?? "approved_as_candidate",
    campaignReviewStatus: campaign.reviewStatus,
    outcomeStatus: outcome?.status,
  });

  return (
    <MpgfPageFrame
      actions={
        <>
          {openForPledges ? <a className="button button-primary" href="#conditional-pledge">Pledge to this pool</a> : null}
          <Link className="button button-secondary" href={`/api/mpgf/dac/campaigns/${campaign.id}`}>
            Public audit JSON
          </Link>
        </>
      }
      description={campaign.publicSummary}
      eyebrow="Dominant assurance contract"
      modeItems={[
        `Published terms v${campaign.publishedTermsVersion}`,
        "Exact SHA-256 binding",
        "Public failure-bonus schedule",
        "Reviewed eligibility",
        outcome ? `Immutable outcome: ${outcome.status}` : "Terminal aggregate only",
      ]}
      participationTitle="How this contract works"
      participationItems={[
        {
          label: "1. Review frozen terms",
          description: "The threshold, supporter minimum, deadline, verification rules, version, and SHA-256 are public before pledging.",
        },
        {
          label: "2. Record conditional intent",
          description: "A signed-in supporter creates immutable consent and a canonical pledge row; no payment object is created.",
        },
        {
          label: "3. Eligibility review",
          description: "An authorized reviewer decides whether each pledge is eligible under the frozen rules.",
        },
        {
          label: "4. Exact terminal result",
          description: "The campaign succeeds when both thresholds are met or lapses after the deadline; one aggregate outcome is then public.",
        },
      ]}
      title={campaign.title}
      viewerPresent={viewerPresent}
    >
      <section className="mpgf-kpi-grid" aria-label="DAC campaign status">
        <div className="mpgf-kpi">
          <span>Lifecycle stage</span>
          <strong>{label(lifecycleStage)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Net threshold</span>
          <strong>{formatUsd(campaign.thresholdAmountCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Minimum supporters</span>
          <strong>{campaign.thresholdSupporters}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Eligible progress</span>
          <strong>{outcome ? `${formatUsd(outcome.eligibleAmountCents)} · ${outcome.eligibleSupporterCount}` : "sealed until finalization"}</strong>
        </div>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Operative contract</p>
          <h2>Exact published terms</h2>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Campaign ID</dt>
              <dd className="mpgf-break-text">{campaign.id}</dd>
            </div>
            <div>
              <dt>Proposal ID</dt>
              <dd className="mpgf-break-text">{campaign.poolProposalId}</dd>
            </div>
            <div>
              <dt>Published version</dt>
              <dd>v{campaign.publishedTermsVersion}</dd>
            </div>
            <div>
              <dt>Published SHA-256</dt>
              <dd className="mpgf-break-text">{campaign.publishedTermsSha256}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd><DateValue value={campaign.publishedAt} /></dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd><DateValue value={campaign.deadlineAt} /></dd>
            </div>
            <div>
              <dt>Threshold visibility</dt>
              <dd>{label(campaign.thresholdVisibility)}</dd>
            </div>
            <div>
              <dt>Progress disclosure</dt>
              <dd>Aggregate only after finalization</dd>
            </div>
          </dl>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Terminal audit</p>
          <h2>{outcome ? `Campaign ${outcome.status}` : "Outcome not finalized"}</h2>
          {outcome ? (
            <>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Eligible amount</dt>
                  <dd>{formatUsd(outcome.eligibleAmountCents)}</dd>
                </div>
                <div>
                  <dt>Eligible supporters</dt>
                  <dd>{outcome.eligibleSupporterCount}</dd>
                </div>
                <div>
                  <dt>Required amount</dt>
                  <dd>{formatUsd(outcome.thresholdAmountCents)}</dd>
                </div>
                <div>
                  <dt>Required supporters</dt>
                  <dd>{outcome.thresholdSupporters}</dd>
                </div>
                <div>
                  <dt>Evaluated</dt>
                  <dd><DateValue value={outcome.evaluatedAt} /></dd>
                </div>
                <div>
                  <dt>Outcome SHA-256</dt>
                  <dd className="mpgf-break-text">{outcome.outcomeSha256}</dd>
                </div>
              </dl>
              <p>
                {outcome.status === "succeeded"
                  ? "Both frozen thresholds were met by eligible canonical pledges. Pledge intents remain recorded as pledged; this outcome does not claim capture or settlement."
                  : "At least one frozen threshold was unmet after the deadline. Still-active signed pledge intents were expired; no refund or bonus payout is claimed by this tranche."}
              </p>
            </>
          ) : (
            <p>
              Pre-terminal pledge totals are not disclosed from private pledge evidence. An authorized reviewer can finalize only against the canonical ledger and exact published terms.
            </p>
          )}
        </article>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Pledge meaning</p>
          <h2>What happens under these exact DAC terms</h2>
          <h3>If both thresholds are met</h3>
          <p>
            An eligible canonical pledge counts toward the {formatUsd(terms.threshold.netRecipientAmountCents)} net-recipient threshold and the {terms.threshold.minimumSupporters}-supporter minimum. The frozen success premium is {formatUsd(terms.successPremium.amountCents)}, paid by {label(terms.successPremium.payer)} and {terms.successPremium.includedInNetThreshold ? "included in" : "additional to"} the net threshold. The gross success requirement is {formatUsd(terms.successPremium.grossSuccessRequirementCents)}.
          </p>
          <h3>If either threshold is unmet after the deadline</h3>
          <p>
            The signed pledge intent expires. The approved failure-bonus rate is {formatBasisPoints(terms.failureBonus.rateBps)}, subject to the frozen eligibility policy, a maximum of {terms.failureBonus.maxParticipants} participants, and at most {formatUsd(terms.failureBonus.maxPerParticipantCents)} per eligible participant. This tranche records the lapse but does not execute the bonus payout.
          </p>
          <h3>Current pledge-only boundary</h3>
          <p>
            Recording a pledge creates immutable consent and one canonical ledger row. It does not collect a payment method or authorize, charge, capture, settle, refund, or pay a failure bonus. Any later money-movement system requires a separate reviewed implementation and separate operative consent.
          </p>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Failure-bonus mechanics</p>
          <h2>Base, timing, continuation, and platform share</h2>
          <dl className="mpgf-summary-grid">
            <div><dt>Schedule status</dt><dd>{terms.failureBonus.scheduleStatus}</dd></div>
            <div><dt>Base type</dt><dd>{label(createTerms?.failureBonusBaseType)}</dd></div>
            <div><dt>Timing mode</dt><dd>{label(createTerms?.failureBonusTimingMode)}</dd></div>
            <div><dt>After final threshold</dt><dd>{label(createTerms?.continuationMode)}</dd></div>
            <div><dt>Moral Trade share</dt><dd>{formatBasisPoints(createTerms?.moralTradeFailureBonusShareBps ?? 0)} of the failure bonus</dd></div>
            <div><dt>Payout method</dt><dd>{label(terms.payoutMethod)}</dd></div>
          </dl>
          {createTerms?.additionalActivationRule ? (
            <><h3>Additional activation rule</h3><p>{createTerms.additionalActivationRule}</p></>
          ) : null}
          {createTerms?.formulaSource ? (
            <><h3>Approved timing formula</h3><pre className="mpgf-code-block">{createTerms.formulaSource}</pre></>
          ) : null}
          <details>
            <summary>Exact threshold and premium schedule</summary>
            <pre className="mpgf-code-block">{exactJson(terms.failureBonus.thresholdSchedule)}</pre>
          </details>
          <details>
            <summary>Exact failure-bonus eligibility policy</summary>
            <pre className="mpgf-code-block">{exactJson(terms.failureBonus.eligibilityPolicy)}</pre>
          </details>
          {createTerms ? (
            <details>
              <summary>Exact base and timing parameters</summary>
              <pre className="mpgf-code-block">{exactJson({
                thresholdAmountsCents: createTerms.thresholdAmountsCents,
                failureBonusBaseTerms: createTerms.failureBonusBaseTerms,
                failureBonusTimingTerms: createTerms.failureBonusTimingTerms,
                formulaHash: createTerms.formulaHash,
                formulaVariables: createTerms.formulaVariables,
              })}</pre>
            </details>
          ) : null}
        </article>
      </section>

      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Public-good destination</p>
          <h2>{label(campaign.destinationType)}</h2>
          <p className="mpgf-break-text">{campaign.destinationRef}</p>
          <div className="tag-row">
            {campaign.causeTags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}
          </div>
        </article>

        <article className="mpgf-panel">
          <p className="eyebrow">Evidence rules</p>
          <h2>Verification, baseline, and exit</h2>
          <h3>Verification method</h3>
          <p>{campaign.verificationMethod}</p>
          <h3>Baseline rule</h3>
          <p>{campaign.baselineRule}</p>
          <h3>Exit rule</h3>
          <p>{campaign.exitRule}</p>
        </article>
      </section>

      <div id="conditional-pledge">
        <MpgfDacPledgePanel
          campaignId={campaign.id}
          campaignPath={campaignPath}
          deadlineAt={campaign.deadlineAt}
          openForPledges={openForPledges}
          termsSha256={campaign.publishedTermsSha256}
          termsVersion={campaign.publishedTermsVersion}
          thresholdAmountCents={campaign.thresholdAmountCents}
          thresholdSupporters={campaign.thresholdSupporters}
          title={campaign.title}
          viewerPresent={viewerPresent}
        />
      </div>

      {viewerPresent ? (
        <section className="mpgf-panel">
          <p className="eyebrow">Your private receipts</p>
          <h2>Canonical pledges bound to this campaign</h2>
          {campaign.ownPledges.length > 0 ? (
            <div className="mpgf-pool-list">
              {campaign.ownPledges.map((pledge) => (
                <article className="mpgf-pool-row" key={pledge.id}>
                  <div>
                    <h3>{formatUsd(pledge.amountCents)} · {label(pledge.status)}</h3>
                    <p>
                      Eligibility: {label(pledge.eligibilityState)} · terms v{pledge.termsVersion} · accepted <DateValue value={pledge.acceptedAt} />
                    </p>
                    <p className="mpgf-break-text">Terms: {pledge.termsSha256}</p>
                    {pledge.consentSha256 ? <p className="mpgf-break-text">Consent: {pledge.consentSha256}</p> : null}
                    <p>
                      Visibility: {label(pledge.visibilityMode)}. The public API does not include this private amount or consent evidence.
                    </p>
                  </div>
                  <span className="mpgf-small">No payment created</span>
                </article>
              ))}
            </div>
          ) : (
            <p>No canonical pledge receipt for this campaign is visible to this account.</p>
          )}
        </section>
      ) : null}

      <section className="mpgf-panel">
        <p className="eyebrow">No-payment boundary</p>
        <h2>“Succeeded” is a threshold outcome, not a claim that money moved.</h2>
        <p>
          This product tranche creates and audits conditional pledge intent only. It does not create a payment method, mandate, payment intent, charge, capture, settlement, refund, success-premium transfer, or failure-bonus payout.
        </p>
      </section>
    </MpgfPageFrame>
  );
}
