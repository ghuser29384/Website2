import Link from "next/link";

import {
  cancelAwaitingTradeDonationAction,
  configureTradeDonationAction,
  startTradeDonationCheckoutAction,
} from "@/app/trade-donation-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { TradeFlowIcon } from "@/components/core-trade/trade-flow-icons";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  formatUsdFromCents,
  TRADE_DONATION_TARGETS,
  type TradeDonationAgreementContext,
} from "@/lib/trade-donation";

import { TradeAgreementStage as BaseTradeAgreementStage } from "./trade-agreement-stage-base";
import styles from "./trade-donation-agreement-stage.module.css";

type BaseProps = Parameters<typeof BaseTradeAgreementStage>[0];

interface TradeDonationAgreementStageProps {
  baseProps: BaseProps;
  context: TradeDonationAgreementContext;
  viewerUserId: string;
}

function initial(label: string) {
  const value = label.trim();
  return value ? value.slice(0, 1).toUpperCase() : "?";
}

function partyLabel(baseProps: BaseProps, role: "proposer" | "responder") {
  return role === "proposer" ? baseProps.proposer.label : baseProps.responder.label;
}

function ProviderBadge({
  environment,
  ready,
}: {
  environment: "staging" | "live";
  ready: boolean;
}) {
  return (
    <span className={`${styles.providerBadge} ${ready ? "" : styles.providerBlocked}`}>
      <span className={styles.providerDot} />
      Every.org · {ready ? (environment === "live" ? "Live" : "Staging") : "Not configured"}
    </span>
  );
}

function OptionalConnectorPanel({ baseProps }: { baseProps: BaseProps }) {
  if (baseProps.lifecycleStatus !== "proposed") return null;
  return (
    <section className={styles.optionalPanel} aria-labelledby="optional-donation-connector-heading">
      <div className={styles.optionalCopy}>
        <div className={styles.eyebrow}>Optional connector</div>
        <h2 id="optional-donation-connector-heading">Replace donation screenshots with provider verification.</h2>
        <p>
          Add a fixed one-time donation leg before either participant confirms. At $10 or more,
          the named payer donates directly through Every.org. Below $10, Moral Trade may use the
          separately gated pooled-settlement flow rather than opening an invalid provider checkout.
        </p>
        <div className={styles.disclosureRow}>
          <span>Direct Every.org checkout is non-custodial; pooled settlement has separate custody and donor-of-record disclosures.</span>
          <span>Source labels are provenance, not endorsements or partnerships.</span>
        </div>
        <Link className={styles.textLink} href="/connectors">
          Inspect connector provenance and launch gates
        </Link>
      </div>
      <form action={configureTradeDonationAction} className={styles.configureForm}>
        <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
        <label>
          <span>Donation destination</span>
          <select defaultValue="against-malaria-foundation" name="target_id">
            {TRADE_DONATION_TARGETS.map((target) => (
              <option key={target.id} value={target.id}>
                {target.shortName}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.twoFields}>
          <label>
            <span>Amount (USD)</span>
            <div className={styles.moneyInput}>
              <b>$</b>
              <input
                defaultValue="10.00"
                inputMode="decimal"
                max="500"
                min="1"
                name="amount_usd"
                required
                step="0.01"
                type="number"
              />
            </div>
          </label>
          <label>
            <span>Who pays</span>
            <select defaultValue="responder" name="payer_role">
              <option value="proposer">{baseProps.proposer.label}</option>
              <option value="responder">{baseProps.responder.label}</option>
            </select>
          </label>
        </div>
        <p>
          Attaching a connector creates a new immutable version. Any confirmation on the current
          version no longer applies.
        </p>
        <PendingSubmitButton className={styles.primaryButton} pendingLabel="Freezing connector terms...">
          Attach automated donation leg
          <TradeFlowIcon name="arrow" />
        </PendingSubmitButton>
      </form>
    </section>
  );
}

function FrozenParty({
  action,
  cause,
  confirmed,
  label,
  role,
  donation,
}: {
  action: string;
  cause: string;
  confirmed: boolean;
  label: string;
  role: string;
  donation?: string;
}) {
  return (
    <article className={styles.partyCard}>
      <div className={styles.partyTop}>
        <span>{role}</span>
        <span className={confirmed ? styles.confirmed : styles.waiting}>
          {confirmed ? "Confirmed" : "Waiting"}
        </span>
      </div>
      <div className={styles.identity}>
        <span className={styles.avatar}>{initial(label)}</span>
        <div>
          <strong>{label}</strong>
          <small>{cause}</small>
        </div>
      </div>
      <p>{action}</p>
      {donation ? (
        <div className={styles.donationLine}>
          <TradeFlowIcon name="route" />
          <span>{donation}</span>
        </div>
      ) : null}
    </article>
  );
}

function ConfirmationStage({
  baseProps,
  context,
}: Pick<TradeDonationAgreementStageProps, "baseProps" | "context">) {
  const term = context.term!;
  const donationLabel = `${formatUsdFromCents(term.amount_cents)} to ${term.target_name}`;
  const payerIsProposer = term.payer_role === "proposer";
  return (
    <section className={styles.stage}>
      <header className={styles.stageHeader}>
        <div>
          <div className={styles.eyebrow}>Donation-backed agreement · Version {baseProps.version.version}</div>
          <h1>Confirm the donation-first sequence.</h1>
        </div>
        <ProviderBadge environment={context.provider.environment} ready={context.provider.ready} />
      </header>
      {baseProps.formMessage ? (
        <div
          className={`${styles.message} ${
            baseProps.formMessage.tone === "error" ? styles.error : styles.success
          }`}
          role="status"
        >
          {baseProps.formMessage.text}
        </div>
      ) : null}
      <div className={styles.sequence}>
        <div className={styles.sequenceStep}>
          <span>1</span>
          <div>
            <strong>Both confirm this exact version</strong>
            <small>Recipient, amount, payer, baseline, and reciprocal action are frozen.</small>
          </div>
        </div>
        <div className={styles.sequenceStep}>
          <span>2</span>
          <div>
            <strong>{partyLabel(baseProps, term.payer_role)} donates through Every.org</strong>
            <small>No screenshot counts. Moral Trade waits for the exact provider webhook.</small>
          </div>
        </div>
        <div className={styles.sequenceStep}>
          <span>3</span>
          <div>
            <strong>The reciprocal action becomes active</strong>
            <small>The action does not begin merely because checkout opened or returned successfully.</small>
          </div>
        </div>
      </div>
      <main className={styles.partyGrid}>
        <FrozenParty
          action={baseProps.proposer.action}
          cause={baseProps.proposer.cause}
          confirmed={baseProps.proposer.confirmed}
          donation={payerIsProposer ? donationLabel : undefined}
          label={baseProps.proposer.label}
          role="Offer-maker commits"
        />
        <div className={styles.swapMark} aria-hidden="true">
          <TradeFlowIcon name="handshake" />
        </div>
        <FrozenParty
          action={baseProps.responder.action}
          cause={baseProps.responder.cause}
          confirmed={baseProps.responder.confirmed}
          donation={!payerIsProposer ? donationLabel : undefined}
          label={baseProps.responder.label}
          role="Counterparty commits"
        />
      </main>
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
          <span>Donation verification</span>
          <strong>Exact amount, currency, one-time frequency, recipient slug/EIN, signed metadata, and unique provider charge.</strong>
        </div>
        <div>
          <span>Research provenance</span>
          <strong>
            <a href={term.source_url} rel="noreferrer" target="_blank">
              {term.source_label}
            </a>{" "}
            · checked {term.source_checked_at}
          </strong>
        </div>
        <div>
          <span>Exit rule</span>
          <strong>{baseProps.version.exitConditions}</strong>
        </div>
      </div>
      <footer className={styles.actionFooter}>
        <div>
          <strong>{baseProps.confirmationCount} / 2 confirmations</strong>
          <span>No money moves and no reciprocal action starts at confirmation one.</span>
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
                <span>I accept the donation-first sequence and the complete frozen terms.</span>
              </label>
              <PendingSubmitButton className={styles.primaryButton} pendingLabel="Recording confirmation...">
                Confirm version {baseProps.version.version}
                <TradeFlowIcon name="arrow" />
              </PendingSubmitButton>
            </form>
          ) : baseProps.viewerConfirmed ? (
            <span className={styles.waitingCopy}>You confirmed · waiting for {baseProps.counterpartLabel}</span>
          ) : null}
          <form action={baseProps.declineAction}>
            <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
            <PendingSubmitButton className={styles.secondaryButton} pendingLabel="Declining...">
              Decline before donation
            </PendingSubmitButton>
          </form>
        </div>
      </footer>
    </section>
  );
}

function WaitingForDonationStage({
  baseProps,
  context,
  viewerUserId,
}: TradeDonationAgreementStageProps) {
  const term = context.term!;
  const intent = context.intent;
  const isPayer = viewerUserId === context.payerUserId;
  const canCancel = !intent || !intent.checkout_started_at;
  return (
    <section className={styles.stage}>
      <header className={styles.stageHeader}>
        <div>
          <div className={styles.eyebrow}>Both confirmed · Reciprocal action inactive</div>
          <h1>The donation is the activation gate.</h1>
        </div>
        <ProviderBadge environment={context.provider.environment} ready={context.provider.ready} />
      </header>
      {baseProps.formMessage ? (
        <div
          className={`${styles.message} ${
            baseProps.formMessage.tone === "error" ? styles.error : styles.success
          }`}
          role="status"
        >
          {baseProps.formMessage.text}
        </div>
      ) : null}
      <div className={styles.activationGrid}>
        <div className={styles.activationAmount}>
          <span>Frozen donation</span>
          <strong>{formatUsdFromCents(term.amount_cents)}</strong>
          <h2>{term.target_name}</h2>
          <p>One-time USD donation · paid by {partyLabel(baseProps, term.payer_role)}</p>
        </div>
        <div className={styles.activationRule}>
          <TradeFlowIcon name="lock" />
          <div>
            <span>Current rule</span>
            <strong>Do not begin the reciprocal action yet.</strong>
            <p>
              Opening checkout, returning to Moral Trade, or providing a screenshot is insufficient.
              Activation occurs only after the authenticated connector endpoint validates the completed-donation webhook.
            </p>
          </div>
        </div>
      </div>
      <div className={styles.providerChecks}>
        <div><span>Recipient</span><strong>{term.nonprofit_slug}</strong></div>
        <div><span>Amount</span><strong>{formatUsdFromCents(term.amount_cents)} USD</strong></div>
        <div><span>Frequency</span><strong>One time</strong></div>
        <div><span>Receipt state</span><strong>{intent?.status.replaceAll("_", " ") ?? "Not started"}</strong></div>
      </div>
      <footer className={styles.paymentFooter}>
        <div className={styles.irrevocableNote}>
          <strong>Donation-first means the charitable gift is not conditional on later meal evidence.</strong>
          <span>The trade record can later show nonperformance, but Moral Trade cannot pull a completed gift back from the nonprofit.</span>
        </div>
        <div className={styles.actions}>
          {isPayer ? (
            context.provider.ready ? (
              <form action={startTradeDonationCheckoutAction}>
                <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
                <PendingSubmitButton className={styles.primaryButton} pendingLabel="Opening Every.org...">
                  {intent ? "Resume secure donation" : `Donate ${formatUsdFromCents(term.amount_cents)}`}
                  <TradeFlowIcon name="arrow" />
                </PendingSubmitButton>
              </form>
            ) : (
              <div className={styles.blockedConnector} role="status">
                <strong>Connector not launch-ready.</strong>
                <span>{context.provider.blockers[0] ?? "Every.org configuration is incomplete."}</span>
              </div>
            )
          ) : (
            <div className={styles.waitingCopy}>
              Waiting for {partyLabel(baseProps, term.payer_role)} to complete the verified donation.
            </div>
          )}
          {canCancel ? (
            <form action={cancelAwaitingTradeDonationAction}>
              <input name="agreement_id" type="hidden" value={baseProps.agreementId} />
              <PendingSubmitButton className={styles.secondaryButton} pendingLabel="Cancelling...">
                Cancel before checkout
              </PendingSubmitButton>
            </form>
          ) : null}
        </div>
      </footer>
    </section>
  );
}

function RecordedDonationStage({
  baseProps,
  context,
}: Pick<TradeDonationAgreementStageProps, "baseProps" | "context">) {
  const term = context.term!;
  const intent = context.intent;
  const isActive = ["active", "evidence_due", "disputed"].includes(baseProps.lifecycleStatus);
  const isCompleted = baseProps.lifecycleStatus === "completed";
  const isEnded = ["cancelled", "expired"].includes(baseProps.lifecycleStatus);
  return (
    <section className={styles.stage}>
      <header className={styles.stageHeader}>
        <div>
          <div className={styles.eyebrow}>
            {isCompleted ? "Final record" : isEnded ? "Ended record" : "Verified donation · Agreement active"}
          </div>
          <h1>
            {isCompleted
              ? "Donation and reciprocal action recorded."
              : isEnded
                ? "This donation-backed agreement ended."
                : "The donation cleared the activation gate."}
          </h1>
        </div>
        <ProviderBadge environment={context.provider.environment} ready={context.provider.ready} />
      </header>
      {baseProps.formMessage ? (
        <div
          className={`${styles.message} ${
            baseProps.formMessage.tone === "error" ? styles.error : styles.success
          }`}
          role="status"
        >
          {baseProps.formMessage.text}
        </div>
      ) : null}
      <div className={styles.receiptCard}>
        <div className={styles.receiptMark}>
          <TradeFlowIcon name={intent?.status === "completed" ? "check" : "evidence"} />
        </div>
        <div className={styles.receiptMain}>
          <span>Provider-confirmed donation</span>
          <strong>{formatUsdFromCents(term.amount_cents)} to {term.target_name}</strong>
          <p>
            {intent?.status === "completed"
              ? "Every.org reported the exact frozen amount, recipient, currency, one-time frequency, signed metadata, and a unique charge."
              : "The connector record is retained, but the provider completion is not in a final verified state."}
          </p>
          <a className={styles.sourceLink} href={term.source_url} rel="noreferrer" target="_blank">
            {term.source_label} · source checked {term.source_checked_at}
          </a>
        </div>
        <dl className={styles.receiptFacts}>
          <div><dt>Status</dt><dd>{intent?.status.replaceAll("_", " ") ?? "missing"}</dd></div>
          <div><dt>Verified</dt><dd>{intent?.completed_at ? <LocalDateTime value={intent.completed_at} fallback={intent.completed_at} /> : "Not recorded"}</dd></div>
          <div><dt>Payment method</dt><dd>{intent?.provider_payment_method || "Not shared"}</dd></div>
          <div><dt>Provider reference</dt><dd>{intent?.provider_charge_id_hash ? `${intent.provider_charge_id_hash.slice(0, 12)}…` : "Not recorded"}</dd></div>
        </dl>
      </div>
      <div className={styles.liveTerms}>
        <article>
          <span>Reciprocal action</span>
          <strong>{term.payer_role === "proposer" ? baseProps.responder.action : baseProps.proposer.action}</strong>
          <p>{isActive ? "Active under the frozen evidence and exit rules." : isCompleted ? "Completion recorded by both participants." : "Future obligations ended; past records remain."}</p>
        </article>
        <article>
          <span>Evidence due</span>
          <strong>{baseProps.evidenceDueAt ? <LocalDateTime value={baseProps.evidenceDueAt} fallback={baseProps.evidenceDueAt} /> : "Not set"}</strong>
          <p>{baseProps.acceptedEvidenceCount} accepted reciprocal-action evidence item(s). The provider donation record is verified separately.</p>
        </article>
        <article>
          <span>Lifecycle</span>
          <strong>{baseProps.lifecycleStatus.replaceAll("_", " ")}</strong>
          <p>{baseProps.completionConfirmationCount} / 2 completion confirmations.</p>
        </article>
      </div>
      <footer className={styles.paymentFooter}>
        <div className={styles.irrevocableNote}>
          <strong>Moral Trade did not custody the charitable funds.</strong>
          <span>The platform verified the provider event and keeps a privacy-safe evidence record; GiveWell, Forethought, Every.org, and recipients do not thereby endorse Moral Trade.</span>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href={`/evidence/${baseProps.agreementId}`}>
            Open evidence dossier
            <TradeFlowIcon name="arrow" />
          </Link>
          <Link className={styles.secondaryButton} href="#terms">Inspect frozen terms</Link>
        </div>
      </footer>
    </section>
  );
}

export function TradeDonationAgreementStage({
  baseProps,
  context,
  viewerUserId,
}: TradeDonationAgreementStageProps) {
  if (!context.term && !context.eligible) {
    return <BaseTradeAgreementStage {...baseProps} />;
  }
  if (!context.term) {
    return (
      <>
        <BaseTradeAgreementStage {...baseProps} />
        <OptionalConnectorPanel baseProps={baseProps} />
      </>
    );
  }
  if (baseProps.lifecycleStatus === "proposed") {
    return <ConfirmationStage baseProps={baseProps} context={context} />;
  }
  if (baseProps.lifecycleStatus === "awaiting_donation") {
    return (
      <WaitingForDonationStage
        baseProps={baseProps}
        context={context}
        viewerUserId={viewerUserId}
      />
    );
  }
  return <RecordedDonationStage baseProps={baseProps} context={context} />;
}
