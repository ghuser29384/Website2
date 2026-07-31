import Link from "next/link";

import {
  requestTradeDonationPoolRefundAction,
  startTradeDonationPoolFundingAction,
} from "@/app/trade-donation-pool-actions";
import { cancelAwaitingTradeDonationAction } from "@/app/trade-donation-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { TradeFlowIcon } from "@/components/core-trade/trade-flow-icons";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  EVERY_ORG_DIRECT_MINIMUM_CENTS,
  type TradeDonationPoolAgreementContext,
} from "@/lib/trade-donation-pool";
import {
  formatUsdFromCents,
  type TradeDonationAgreementContext,
} from "@/lib/trade-donation";

import { TradeAgreementStage as BaseTradeAgreementStage } from "./trade-agreement-stage-base";
import styles from "./trade-donation-agreement-stage.module.css";

export type PooledBaseProps = Parameters<typeof BaseTradeAgreementStage>[0];

interface TradeDonationPoolAgreementStageProps {
  baseProps: PooledBaseProps;
  context: TradeDonationAgreementContext;
  poolContext: TradeDonationPoolAgreementContext;
  viewerUserId: string;
}

function partyLabel(baseProps: PooledBaseProps, role: "proposer" | "responder") {
  return role === "proposer" ? baseProps.proposer.label : baseProps.responder.label;
}

function PoolBadge({ poolContext }: { poolContext: TradeDonationPoolAgreementContext }) {
  const ready = poolContext.config.readyForParticipantFunding;
  return (
    <span className={`${styles.providerBadge} ${ready ? "" : styles.providerBlocked}`}>
      <span className={styles.providerDot} />
      Pooled settlement · {poolContext.config.mode === "disabled" ? "Disabled" : poolContext.config.mode}
    </span>
  );
}

function StatusMessage({ baseProps }: { baseProps: PooledBaseProps }) {
  return baseProps.formMessage ? (
    <div
      className={`${styles.message} ${
        baseProps.formMessage.tone === "error" ? styles.error : styles.success
      }`}
      role="status"
    >
      {baseProps.formMessage.text}
    </div>
  ) : null;
}

function PooledConfirmationStage({
  baseProps,
  context,
  poolContext,
}: Omit<TradeDonationPoolAgreementStageProps, "viewerUserId">) {
  const term = context.term!;
  return (
    <section className={styles.stage}>
      <header className={styles.stageHeader}>
        <div>
          <div className={styles.eyebrow}>
            Pooled donation-backed agreement · Version {baseProps.version.version}
          </div>
          <h1>Confirm the pooled-settlement sequence.</h1>
        </div>
        <PoolBadge poolContext={poolContext} />
      </header>
      <StatusMessage baseProps={baseProps} />

      <div className={styles.sequence}>
        <div className={styles.sequenceStep}>
          <span>1</span>
          <div>
            <strong>Both confirm this exact version</strong>
            <small>Recipient, allocation, payer, evidence, exit, and baseline remain frozen.</small>
          </div>
        </div>
        <div className={styles.sequenceStep}>
          <span>2</span>
          <div>
            <strong>{partyLabel(baseProps, term.payer_role)} funds the exact obligation through Stripe</strong>
            <small>The signed Stripe webhook—not a browser return—marks the contribution funded.</small>
          </div>
        </div>
        <div className={styles.sequenceStep}>
          <span>3</span>
          <div>
            <strong>Moral Trade consolidates compatible obligations</strong>
            <small>Same recipient, currency, frequency, and environment; different users may share one bundle.</small>
          </div>
        </div>
        <div className={styles.sequenceStep}>
          <span>4</span>
          <div>
            <strong>Every.org verifies the aggregate; all components settle atomically</strong>
            <small>Any mismatch activates zero agreements and sends the bundle to review.</small>
          </div>
        </div>
      </div>

      <div className={styles.activationGrid}>
        <div className={styles.activationAmount}>
          <span>Frozen allocation</span>
          <strong>{formatUsdFromCents(term.amount_cents)}</strong>
          <h2>{term.target_name}</h2>
          <p>
            One-time USD obligation · funded by {partyLabel(baseProps, term.payer_role)}
          </p>
        </div>
        <div className={styles.activationRule}>
          <TradeFlowIcon name="lock" />
          <div>
            <span>Custody and donor-of-record boundary</span>
            <strong>The participant is not making a direct Every.org donation.</strong>
            <p>
              The participant pays Moral Trade toward a pooled settlement. Moral Trade makes the consolidated Every.org gift and is the presumptive provider-facing donor of record. The participant payment is not represented as a direct tax-deductible charitable donation. Processing fees are absorbed by Moral Trade and do not reduce the frozen allocation.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.frozenFacts}>
        <div>
          <span>No-trade baseline</span>
          <strong>{baseProps.version.noTradeBaseline}</strong>
        </div>
        <div>
          <span>Evidence rule</span>
          <strong>{baseProps.version.evidenceRule}</strong>
        </div>
        <div>
          <span>Bundle compatibility</span>
          <strong>Provider environment, recipient slug/EIN, USD currency, and one-time frequency.</strong>
        </div>
        <div>
          <span>Minimum provider checkout</span>
          <strong>{formatUsdFromCents(EVERY_ORG_DIRECT_MINIMUM_CENTS)}</strong>
        </div>
        <div>
          <span>Exit rule</span>
          <strong>{baseProps.version.exitConditions}</strong>
        </div>
      </div>

      <footer className={styles.actionFooter}>
        <div>
          <strong>{baseProps.confirmationCount} / 2 confirmations</strong>
          <span>No payment or reciprocal action starts at confirmation one.</span>
        </div>
        <div className={styles.actions}>
          {baseProps.canConfirm ? (
            <form action={baseProps.confirmAction} className={styles.confirmForm}>
              <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
              <input
                name="agreement_version_id"
                type="hidden"
                value={baseProps.version.id}
              />
              <label className={styles.reviewCheck}>
                <input name="terms_reviewed" required type="checkbox" />
                <span>I accept the pooled-settlement sequence and the complete frozen terms.</span>
              </label>
              <PendingSubmitButton
                className={styles.primaryButton}
                pendingLabel="Recording confirmation..."
              >
                Confirm version {baseProps.version.version}
                <TradeFlowIcon name="arrow" />
              </PendingSubmitButton>
            </form>
          ) : baseProps.viewerConfirmed ? (
            <span className={styles.waitingCopy}>
              You confirmed · waiting for {baseProps.counterpartLabel}
            </span>
          ) : null}
          <form action={baseProps.declineAction}>
            <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
            <PendingSubmitButton className={styles.secondaryButton} pendingLabel="Declining...">
              Decline before funding
            </PendingSubmitButton>
          </form>
        </div>
      </footer>
    </section>
  );
}

function obligationStateCopy(poolContext: TradeDonationPoolAgreementContext) {
  const obligation = poolContext.obligation;
  if (!obligation) {
    return {
      title: "Not funded",
      detail: "The designated payer has not opened pooled-funding checkout.",
    };
  }
  const labels: Record<string, { title: string; detail: string }> = {
    awaiting_funding: {
      title: "Awaiting participant funding",
      detail: "No Stripe Checkout Session is active.",
    },
    checkout_started: {
      title: "Stripe checkout started",
      detail: "A browser return is not proof. Moral Trade is waiting for the signed Stripe webhook.",
    },
    checkout_abandoned: {
      title: "Checkout abandoned",
      detail: "No funded contribution was recorded. The payer may start a replacement checkout.",
    },
    payment_failed: {
      title: "Payment failed",
      detail: obligation.failure_message || "The payer may retry with another eligible payment method.",
    },
    funded: {
      title: "Contribution verified",
      detail: "The allocation is waiting for compatible funded obligations to reach the provider minimum.",
    },
    bundled: {
      title: "Bundle frozen",
      detail: "This allocation is immutable. Participant cancellation and self-service refund are disabled.",
    },
    settled: {
      title: "Provider allocation settled",
      detail: "Every.org verified the aggregate and Moral Trade allocated this component atomically.",
    },
    refund_pending: {
      title: "Refund pending",
      detail: "Moral Trade is waiting for Stripe's signed refund event.",
    },
    refunded: {
      title: "Contribution refunded",
      detail: "The obligation was not included in a consolidated gift.",
    },
    needs_review: {
      title: "Operator review required",
      detail: obligation.failure_message || "A component, provider, or settlement mismatch occurred.",
    },
    disputed: {
      title: "Payment disputed",
      detail: obligation.failure_message || "The dispute cannot silently reverse a completed charitable gift.",
    },
    cancelled: {
      title: "Obligation cancelled",
      detail: obligation.failure_message || "No settlement allocation remains active.",
    },
  };
  return labels[obligation.status] ?? { title: obligation.status, detail: "Status unavailable." };
}

function PooledWaitingStage({
  baseProps,
  context,
  poolContext,
  viewerUserId,
}: TradeDonationPoolAgreementStageProps) {
  const term = context.term!;
  const obligation = poolContext.obligation;
  const bundle = poolContext.bundle;
  const isPayer = viewerUserId === context.payerUserId;
  const stateCopy = obligationStateCopy(poolContext);
  const canStartFunding =
    isPayer &&
    poolContext.config.readyForParticipantFunding &&
    (!obligation ||
      ["awaiting_funding", "checkout_started", "checkout_abandoned", "payment_failed"].includes(
        obligation.status,
      ));
  const canRefund = isPayer && obligation?.status === "funded" && !obligation.bundle_id;
  const canCancelAgreement = !obligation || ["awaiting_funding", "checkout_abandoned", "payment_failed"].includes(obligation.status);

  return (
    <section className={styles.stage}>
      <header className={styles.stageHeader}>
        <div>
          <div className={styles.eyebrow}>Both confirmed · Reciprocal action inactive</div>
          <h1>The pooled donation is the activation gate.</h1>
        </div>
        <PoolBadge poolContext={poolContext} />
      </header>
      <StatusMessage baseProps={baseProps} />

      <div className={styles.activationGrid}>
        <div className={styles.activationAmount}>
          <span>Frozen allocation</span>
          <strong>{formatUsdFromCents(term.amount_cents)}</strong>
          <h2>{term.target_name}</h2>
          <p>Participant payment to Moral Trade · one-time USD settlement obligation</p>
        </div>
        <div className={styles.activationRule}>
          <TradeFlowIcon name="lock" />
          <div>
            <span>Current rule</span>
            <strong>Do not begin the reciprocal action yet.</strong>
            <p>
              Stripe funding, bundle freeze, or opening Every.org is insufficient. Activation occurs only when the exact aggregate provider webhook validates every immutable component and the database commits every allocation together.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.providerChecks}>
        <div><span>Participant contribution</span><strong>{stateCopy.title}</strong></div>
        <div><span>Eligible funded total</span><strong>{formatUsdFromCents(poolContext.eligibleFundedTotalCents)}</strong></div>
        <div><span>Remaining to provider threshold</span><strong>{formatUsdFromCents(poolContext.remainingToThresholdCents)}</strong></div>
        <div><span>Bundle</span><strong>{bundle ? `${bundle.status.replaceAll("_", " ")} · ${formatUsdFromCents(bundle.amount_cents)}` : "Not frozen"}</strong></div>
      </div>

      <div className={styles.liveTerms}>
        <article>
          <span>Status detail</span>
          <strong>{stateCopy.detail}</strong>
          <p>{obligation?.failure_code ? `Code: ${obligation.failure_code}` : "No mismatch recorded."}</p>
        </article>
        <article>
          <span>Participant receipt</span>
          <strong>Settlement receipt—not an Every.org charitable receipt</strong>
          <p>Moral Trade is the presumptive provider-facing donor of record for the aggregate.</p>
        </article>
        <article>
          <span>Allocation invariant</span>
          <strong>Fees never reduce {formatUsdFromCents(term.amount_cents)}</strong>
          <p>The ledger must balance and the bundle manifest total must equal every component allocation.</p>
        </article>
      </div>

      <footer className={styles.paymentFooter}>
        <div className={styles.irrevocableNote}>
          <strong>Refunds are available only before bundle freeze.</strong>
          <span>After freeze, Moral Trade may already be relying on the contribution to make an irreversible consolidated gift. Any later refund or chargeback is an operator-review and reserve event.</span>
        </div>
        <div className={styles.actions}>
          {canStartFunding ? (
            <form action={startTradeDonationPoolFundingAction} className={styles.confirmForm}>
              <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
              <label className={styles.reviewCheck}>
                <input name="pooled_disclosures" required type="checkbox" />
                <span>
                  I understand I am paying Moral Trade toward pooled settlement; Moral Trade makes the consolidated Every.org gift, is the presumptive provider-facing donor of record, does not represent this payment as my direct tax-deductible donation, absorbs processing fees, and permits self-service refund only before bundle freeze.
                </span>
              </label>
              <PendingSubmitButton className={styles.primaryButton} pendingLabel="Opening Stripe...">
                {obligation?.status === "checkout_started" ? "Resume" : "Fund"}{" "}
                {formatUsdFromCents(term.amount_cents)} obligation
                <TradeFlowIcon name="arrow" />
              </PendingSubmitButton>
            </form>
          ) : !poolContext.config.readyForParticipantFunding && isPayer ? (
            <div className={styles.blockedConnector} role="status">
              <strong>Pooled settlement is fail-closed.</strong>
              <span>{poolContext.config.blockers[0] ?? "Required configuration or approval is missing."}</span>
            </div>
          ) : !isPayer ? (
            <div className={styles.waitingCopy}>
              {obligation?.status === "funded"
                ? `${partyLabel(baseProps, term.payer_role)} funded the obligation; waiting for a compatible bundle.`
                : obligation?.status === "bundled"
                  ? "The contribution is in a frozen bundle; waiting for Moral Trade's verified aggregate donation."
                  : `Waiting for ${partyLabel(baseProps, term.payer_role)} to fund the pooled obligation.`}
            </div>
          ) : null}

          {canRefund && obligation ? (
            <form action={requestTradeDonationPoolRefundAction}>
              <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
              <input name="obligation_id" type="hidden" value={obligation.id} />
              <PendingSubmitButton className={styles.secondaryButton} pendingLabel="Requesting refund...">
                Refund before bundle freeze
              </PendingSubmitButton>
            </form>
          ) : null}

          {canCancelAgreement ? (
            <form action={cancelAwaitingTradeDonationAction}>
              <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
              <PendingSubmitButton className={styles.secondaryButton} pendingLabel="Cancelling...">
                Cancel before verified funding
              </PendingSubmitButton>
            </form>
          ) : null}
        </div>
      </footer>
    </section>
  );
}

function PooledRecordedStage({
  baseProps,
  context,
  poolContext,
}: Omit<TradeDonationPoolAgreementStageProps, "viewerUserId">) {
  const term = context.term!;
  const obligation = poolContext.obligation;
  const bundle = poolContext.bundle;
  const active = ["active", "evidence_due", "disputed"].includes(baseProps.lifecycleStatus);
  const completed = baseProps.lifecycleStatus === "completed";
  return (
    <section className={styles.stage}>
      <header className={styles.stageHeader}>
        <div>
          <div className={styles.eyebrow}>
            {completed ? "Final pooled-settlement record" : "Verified pooled allocation · Agreement active"}
          </div>
          <h1>{completed ? "Donation allocation and reciprocal action recorded." : "The pooled donation cleared the activation gate."}</h1>
        </div>
        <PoolBadge poolContext={poolContext} />
      </header>
      <StatusMessage baseProps={baseProps} />

      <div className={styles.receiptCard}>
        <div className={styles.receiptMark}><TradeFlowIcon name="check" /></div>
        <div className={styles.receiptMain}>
          <span>Provider-confirmed pooled allocation</span>
          <strong>{formatUsdFromCents(term.amount_cents)} to {term.target_name}</strong>
          <p>
            Every.org confirmed the aggregate bundle and Moral Trade allocated this exact component in the same database transaction as every other component. Moral Trade—not the participant—was the provider-facing payer.
          </p>
          <a className={styles.sourceLink} href={term.source_url} rel="noreferrer" target="_blank">
            {term.source_label} · source checked {term.source_checked_at}
          </a>
        </div>
        <dl className={styles.receiptFacts}>
          <div><dt>Obligation</dt><dd>{obligation?.status.replaceAll("_", " ") ?? "missing"}</dd></div>
          <div><dt>Bundle</dt><dd>{bundle?.status.replaceAll("_", " ") ?? "missing"}</dd></div>
          <div><dt>Verified</dt><dd>{bundle?.completed_at ? <LocalDateTime value={bundle.completed_at} fallback={bundle.completed_at} /> : "Not recorded"}</dd></div>
          <div><dt>Manifest</dt><dd>{bundle?.manifest_hash ? `${bundle.manifest_hash.slice(0, 12)}…` : "Not recorded"}</dd></div>
        </dl>
      </div>

      <div className={styles.liveTerms}>
        <article>
          <span>Reciprocal action</span>
          <strong>{term.payer_role === "proposer" ? baseProps.responder.action : baseProps.proposer.action}</strong>
          <p>{active ? "Active under the frozen evidence and exit rules." : "Completion or later lifecycle recorded."}</p>
        </article>
        <article>
          <span>Evidence due</span>
          <strong>{baseProps.evidenceDueAt ? <LocalDateTime value={baseProps.evidenceDueAt} fallback={baseProps.evidenceDueAt} /> : "Not set"}</strong>
          <p>{baseProps.acceptedEvidenceCount} accepted reciprocal-action evidence item(s). Provider allocation evidence is separate.</p>
        </article>
        <article>
          <span>Donor-of-record disclosure</span>
          <strong>Moral Trade was the aggregate payer</strong>
          <p>The participant receipt is a settlement record and is not represented as an Every.org charitable tax receipt.</p>
        </article>
      </div>

      <footer className={styles.paymentFooter}>
        <div className={styles.irrevocableNote}>
          <strong>A later chargeback cannot pull the charitable gift back.</strong>
          <span>It creates a reserve loss and operator-review record without silently erasing the provider evidence or pretending the participant remained the donor.</span>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href={`/evidence/${baseProps.agreementId}`}>
            Open evidence dossier <TradeFlowIcon name="arrow" />
          </Link>
          <Link className={styles.secondaryButton} href="#terms">Inspect frozen terms</Link>
        </div>
      </footer>
    </section>
  );
}

export function TradeDonationPoolAgreementStage(props: TradeDonationPoolAgreementStageProps) {
  if (props.baseProps.lifecycleStatus === "proposed") {
    return (
      <PooledConfirmationStage
        baseProps={props.baseProps}
        context={props.context}
        poolContext={props.poolContext}
      />
    );
  }
  if (props.baseProps.lifecycleStatus === "awaiting_donation") {
    return <PooledWaitingStage {...props} />;
  }
  return (
    <PooledRecordedStage
      baseProps={props.baseProps}
      context={props.context}
      poolContext={props.poolContext}
    />
  );
}
