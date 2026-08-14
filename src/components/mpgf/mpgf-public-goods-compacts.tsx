"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  MPGF_PUBLIC_GOODS_COMPACT_TERMS,
  type MpgfPublicGoodsCompactState,
  type MpgfPublicGoodsCompactsState,
} from "@/lib/mpgf/public-goods-compacts";
import styles from "./mpgf-public-goods-compacts.module.css";

interface Props { state: MpgfPublicGoodsCompactsState; viewerPresent: boolean }
interface MutationResponse { ok?: boolean; error?: string; revokedImmediately?: boolean; exitEffectiveAt?: string | null }
const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatUsd(cents: number | null) { return cents === null ? "Unavailable" : usdFormatter.format(cents / 100); }
function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(date) : "Unavailable";
}
function statusLabel(value: string) { return value.replaceAll("_", " "); }
function idempotencyKey(scope: string) { return `mpgf.compact.v2.${scope}.${crypto.randomUUID()}`; }
async function mutationRequest(path: string, method: "POST" | "PUT" | "DELETE", body: Record<string, unknown>) {
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = (await response.json().catch(() => ({}))) as MutationResponse;
  if (!response.ok || !result.ok) throw new Error(result.error ?? "The Compact request could not be completed.");
  return result;
}

function CharterTerms({ compact }: { compact: MpgfPublicGoodsCompactState }) {
  return (
    <dl className={styles.terms}>
      <div><dt>Aggregate obligation</dt><dd>10% of the prior complete UTC month&apos;s eligible net-settled outgoing Moral Trade payments; no cap</dd></div>
      <div><dt>Monthly qualification</dt><dd>At least $1 actually net settled to this Compact</dd></div>
      <div><dt>Numerical readiness</dt><dd>100 verified unique people and $500 planned in the same frozen snapshot</dd></div>
      <div><dt>Voting weight</dt><dd>70% equal + 30% square-root net-settled contribution</dd></div>
      <div><dt>Delegation</dt><dd>Direct only; incoming weight cannot be re-delegated; 10% proxy cap</dd></div>
      <div><dt>Exit</dt><dd>{compact.terms.minimumTermMonths}-month minimum after activation, then {compact.terms.exitNoticeDays} days&apos; notice</dd></div>
    </dl>
  );
}

function Readiness({ compact }: { compact: MpgfPublicGoodsCompactState }) {
  const readiness = compact.readiness;
  const peopleBps = Math.min(10_000, Math.floor(readiness.fundingQualifiedUniquePersonCount * 10_000 / MPGF_PUBLIC_GOODS_COMPACT_TERMS.readinessThresholdMembers));
  const fundingBps = Math.min(10_000, Math.floor(readiness.scheduledContributionCents * 10_000 / MPGF_PUBLIC_GOODS_COMPACT_TERMS.readinessThresholdScheduledCents));
  const progressBps = Math.min(peopleBps, fundingBps);
  return (
    <div className={styles.progress} data-testid={`readiness-${compact.publicKey}`}>
      <div className={styles.progressLabel}>
        <span>{readiness.fundingQualifiedUniquePersonCount}/100 people · {formatUsd(readiness.scheduledContributionCents)}/$500 planned</span>
        <span>{readiness.thresholdReady ? "Threshold ready; activation blocked" : "Recruiting"}</span>
      </div>
      <div className={styles.progressTrack} role="progressbar" aria-label={`${compact.title} numerical readiness`} aria-valuemin={0} aria-valuemax={10_000} aria-valuenow={progressBps}>
        <span style={{ width: `${progressBps / 100}%` }} />
      </div>
    </div>
  );
}

export function MpgfPublicGoodsCompacts({ state, viewerPresent }: Props) {
  const router = useRouter();
  const [selectedPublicKey, setSelectedPublicKey] = useState(state.compacts.find((compact) => compact.membership)?.publicKey ?? state.compacts[0]?.publicKey ?? "");
  const [acknowledgements, setAcknowledgements] = useState({ voluntary: false, constitution: false, binding: false, noPayment: false });
  const joined = useMemo(() => state.compacts.filter((compact) => compact.membership && !["revoked", "exited"].includes(compact.membership.status)), [state.compacts]);
  const [allocationPercent, setAllocationPercent] = useState<Record<string, string>>(() => Object.fromEntries(joined.map((compact) => {
    const row = state.allocation.allocations.find((allocation) => allocation.compactPublicKey === compact.publicKey);
    return [compact.publicKey, row ? String(row.allocationBps / 100) : ""];
  })));
  const [delegateeMembershipId, setDelegateeMembershipId] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("No action on this page moves money, creates a payment mandate, or records a payment receipt.");
  const selectedCompact = state.compacts.find((compact) => compact.publicKey === selectedPublicKey) ?? state.compacts[0] ?? null;
  const allAcknowledged = Object.values(acknowledgements).every(Boolean);

  async function runAction(action: string, callback: () => Promise<MutationResponse>, success: (result: MutationResponse) => string) {
    setPendingAction(action);
    setStatusMessage("Saving a private Compact instruction. No money is moving.");
    try { const result = await callback(); setStatusMessage(success(result)); router.refresh(); }
    catch (error) { setStatusMessage(error instanceof Error ? error.message : "The Compact request could not be completed."); }
    finally { setPendingAction(null); }
  }

  async function joinCompact() {
    if (!selectedCompact || !allAcknowledged) { setStatusMessage("Complete every constitutional acknowledgement before joining."); return; }
    await runAction("join", () => mutationRequest("/api/mpgf/compacts/membership", "POST", {
      compactPublicKey: selectedCompact.publicKey,
      constitutionVersion: selectedCompact.constitutionVersion,
      acknowledgements: { voluntaryChoice: acknowledgements.voluntary, exactConstitution: acknowledgements.constitution, activationAndNoProjectOptOut: acknowledgements.binding, noPaymentMandate: acknowledgements.noPayment },
      idempotencyKey: idempotencyKey("join"),
    }), () => `Joined ${selectedCompact.title} under Compact v2. This is membership, not a charge, payment schedule, mandate, receipt, or tax-deductibility claim.`);
  }

  async function saveAllocation() {
    const allocationBps: Record<string, number> = {};
    for (const compact of joined) {
      const raw = allocationPercent[compact.publicKey]?.trim() ?? "";
      if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) { setStatusMessage("Enter every allocation percentage with at most two decimal places."); return; }
      const bps = Math.round(Number(raw) * 100);
      if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) { setStatusMessage("Every allocation must be between 0% and 100%."); return; }
      allocationBps[compact.publicKey] = bps;
    }
    if (Object.values(allocationBps).reduce((sum, value) => sum + value, 0) !== 10_000) { setStatusMessage("Allocations must total exactly 100.00%."); return; }
    await runAction("allocate", () => mutationRequest("/api/mpgf/compacts/allocation", "PUT", { allocationBps, idempotencyKey: idempotencyKey("allocation") }), () => "Saved the complete 100% allocation instruction. It is not a charge or payment authorization; planned cents remain unavailable until authoritative outflow coverage exists.");
  }

  async function requestExit() {
    if (!selectedCompact) return;
    await runAction("exit", () => mutationRequest("/api/mpgf/compacts/membership", "DELETE", { compactPublicKey: selectedCompact.publicKey, idempotencyKey: idempotencyKey("exit") }), (result) => result.revokedImmediately ? `Revoked ${selectedCompact.title} acceptance while recruiting. No money moved.` : `Recorded prospective exit effective ${formatDate(result.exitEffectiveAt ?? null)}. No money moved.`);
  }

  async function setDelegation() {
    if (!selectedCompact) return;
    await runAction("delegate", () => mutationRequest("/api/mpgf/compacts/delegation", "PUT", { compactPublicKey: selectedCompact.publicKey, cycleKey: state.obligation.cycleKey, delegateeMembershipId, idempotencyKey: idempotencyKey("delegate") }), () => "Saved one direct delegation for this frozen cycle. Incoming delegated weight will not follow it, and no money or membership moved.");
  }

  async function clearDelegation() {
    if (!selectedCompact) return;
    await runAction("clear-delegation", () => mutationRequest("/api/mpgf/compacts/delegation", "DELETE", { compactPublicKey: selectedCompact.publicKey, cycleKey: state.obligation.cycleKey, idempotencyKey: idempotencyKey("clear-delegation") }), () => "Revoked the direct delegation. No money or membership moved.");
  }

  return (
    <>
      <div className={styles.boundaryStrip} aria-label="Compact boundaries">
        <div className={styles.boundaryItem}><strong>One aggregate obligation</strong><span>Exactly 10% of eligible net-settled prior-month Moral Trade outflow, divided across every joined Compact; no cap.</span></div>
        <div className={styles.boundaryItem}><strong>Actual settlement governs</strong><span>Plans are never presented as payments. Refunds, reversals, and chargebacks reduce qualification and voting weight.</span></div>
        <div className={styles.boundaryItem}><strong>No collection rail</strong><span>Joining or allocating creates no charge, mandate, receipt, custody, donation, or tax deduction.</span></div>
      </div>

      <section className={styles.workspace} aria-labelledby="obligation-heading">
        <p className="eyebrow">Frozen cycle {state.obligation.cycleKey}</p>
        <h3 id="obligation-heading">Prior-month transaction coverage</h3>
        <div className={styles.statusGrid}>
          <div><span>Coverage</span><strong>{statusLabel(state.obligation.coverage)}</strong></div>
          <div><span>Eligible net-settled outflow</span><strong>{formatUsd(state.obligation.eligibleNetSettledOutflowCents)}</strong></div>
          <div><span>Aggregate 10% obligation</span><strong>{formatUsd(state.obligation.obligationCents)}</strong></div>
          <div><span>Allocation state</span><strong>{state.allocation.schedulingReady ? "Complete and cent-exact" : state.allocation.instructionValid ? "Percentages saved; cents blocked" : "Incomplete; fail closed"}</strong></div>
        </div>
        <p className={styles.statusMessage}>{state.obligation.coverageReason} No amount is inferred from self-reporting or partial payment tables.</p>
      </section>

      {!state.available ? <p className={styles.unavailable} role="status" data-testid="compact-unavailable"><strong>Live Compact v2 state unavailable.</strong> Published constitution examples are shown without fabricated activity. {state.unavailableReason}</p> : null}

      <div className={styles.charterGrid}>
        {state.compacts.map((compact) => (
          <article className={`${styles.charterCard} ${compact.publicKey === selectedCompact?.publicKey ? styles.charterCardSelected : ""}`} key={compact.publicKey} data-testid={`compact-${compact.publicKey}`}>
            <div className={styles.charterHeader}><h3>{compact.title}</h3><span>{compact.membership && !["revoked", "exited"].includes(compact.membership.status) ? "charter member" : statusLabel(compact.status)}</span></div>
            <p>{compact.summary}</p>
            <Readiness compact={compact} />
            <CharterTerms compact={compact} />
            <button className="button button-secondary" type="button" onClick={() => setSelectedPublicKey(compact.publicKey)} aria-pressed={compact.publicKey === selectedCompact?.publicKey}>{compact.publicKey === selectedCompact?.publicKey ? "Selected Compact" : `Select ${compact.title}`}</button>
          </article>
        ))}
      </div>

      {selectedCompact ? (
        <div className={styles.workspaceGrid}>
          <section className={styles.workspace} aria-labelledby="compact-workspace-heading">
            <p className="eyebrow">Membership is distinct from monthly qualification</p>
            <h3 id="compact-workspace-heading">{selectedCompact.title}</h3>
            {selectedCompact.membership && !["revoked", "exited"].includes(selectedCompact.membership.status) ? (
              <div className={styles.membershipSummary}>
                <div className={styles.charterHeader}><h4>Private membership state</h4><span className={styles.statusBadge}>{statusLabel(selectedCompact.membership.status)}</span></div>
                <div className={styles.statusGrid}>
                  <div><span>Allocation</span><strong>{selectedCompact.membership.allocationBps === null ? "Incomplete" : `${(selectedCompact.membership.allocationBps / 100).toFixed(2)}%`}</strong></div>
                  <div><span>Planned amount</span><strong>{formatUsd(selectedCompact.membership.scheduledContributionCents)}</strong></div>
                  <div><span>Net settled amount</span><strong>{formatUsd(selectedCompact.membership.netSettledContributionCents)}</strong></div>
                  <div><span>Funding qualification</span><strong>{selectedCompact.membership.fundingQualificationState === "scheduled_qualified" ? "Planned only (recruiting)" : selectedCompact.membership.fundingQualificationState === "settled_qualified" ? "Actual net settlement" : "Not qualified this cycle"}</strong></div>
                </div>
                <p>Below $1, incomplete allocation, missing identity verification, or insufficient net settlement removes monthly voting/delegation qualification but does not erase charter membership.</p>
                <button className="button button-secondary" type="button" onClick={requestExit} disabled={pendingAction !== null}>{selectedCompact.membership.status === "pending_activation" ? "Revoke recruiting acceptance" : "Request prospective exit"}</button>
              </div>
            ) : (
              <>
                <fieldset className={styles.acknowledgements}>
                  <legend>Explicit Compact v2 acknowledgements</legend>
                  <label><input type="checkbox" checked={acknowledgements.voluntary} onChange={(event) => setAcknowledgements((current) => ({ ...current, voluntary: event.target.checked }))} disabled={!viewerPresent || !state.available} />I voluntarily choose this cause-specific Compact; I was not assigned to it.</label>
                  <label><input type="checkbox" checked={acknowledgements.constitution} onChange={(event) => setAcknowledgements((current) => ({ ...current, constitution: event.target.checked }))} disabled={!viewerPresent || !state.available} />I accept {selectedCompact.constitutionVersion}: one aggregate uncapped 10% obligation, exact allocation, $1 Compact-local qualification, 100 + $500 readiness, 70/30 voting, and direct delegation with a 10% cap.</label>
                  <label><input type="checkbox" checked={acknowledgements.binding} onChange={(event) => setAcknowledgements((current) => ({ ...current, binding: event.target.checked }))} disabled={!viewerPresent || !state.available} />I understand numerical readiness cannot activate the Compact while identity, legal, payment, provider, and release gates remain blocked.</label>
                  <label><input type="checkbox" checked={acknowledgements.noPayment} onChange={(event) => setAcknowledgements((current) => ({ ...current, noPayment: event.target.checked }))} disabled={!viewerPresent || !state.available} />I understand joining is not a contribution, charge, payment authorization, receipt, custody claim, or tax deduction.</label>
                </fieldset>
                <div className={styles.actions}>{viewerPresent ? <button className="button button-primary" type="button" onClick={joinCompact} disabled={!state.available || pendingAction !== null || !allAcknowledged}>Accept v2 constitution and join</button> : <Link className="button button-primary" href="/login?returnTo=/mpgf/compacts">Sign in to join</Link>}</div>
              </>
            )}
            <p className={styles.statusMessage} role="status" aria-live="polite">{statusMessage}</p>
          </section>

          <aside className={styles.safetyPanel} aria-labelledby="allocation-heading">
            <p className="eyebrow">One allocation across all joined Compacts</p>
            <h3 id="allocation-heading">Percentages must total exactly 100.00%</h3>
            {joined.length === 0 ? <p>Join at least one Compact before allocating.</p> : joined.length === 1 ? <p>The sole joined Compact defaults to 100%. This is an allocation instruction only; no planned cents exist until authoritative prior-month coverage is complete.</p> : (
              <>
                {joined.map((compact) => <div className={styles.field} key={compact.publicKey}><label htmlFor={`allocation-${compact.publicKey}`}>{compact.title} (%)</label><input id={`allocation-${compact.publicKey}`} type="text" inputMode="decimal" value={allocationPercent[compact.publicKey] ?? ""} onChange={(event) => setAllocationPercent((current) => ({ ...current, [compact.publicKey]: event.target.value }))} disabled={!state.available || pendingAction !== null} /><span className={styles.fieldHint}>0.00% is allowed and preserves membership, but cannot qualify this Compact for the month.</span></div>)}
                <button className="button button-primary" type="button" onClick={saveAllocation} disabled={!state.available || pendingAction !== null}>Save complete allocation</button>
              </>
            )}
            <ul className={styles.safetyList}>
              <li><strong>Largest remainder:</strong> fractional cents are assigned deterministically by remainder, then stable Compact key, so scheduled cents equal the obligation exactly.</li>
              <li><strong>Readiness:</strong> threshold-ready still means activation-blocked while every operational gate remains unmet.</li>
              <li><strong>Voting:</strong> only actual net settlement in the frozen cycle can produce weight; plans never do.</li>
            </ul>
            {selectedCompact.membership?.fundingQualified && selectedCompact.allocationElectorate.active ? (
              <div className={styles.workspace}>
                <h4>Direct delegation for {state.obligation.cycleKey}</h4>
                <p>Only a funding-qualified member of this Compact can receive it. Incoming weight stays here even if the proxy delegates their own weight.</p>
                <div className={styles.field}><label htmlFor="delegatee-membership-id">Qualified membership ID</label><input id="delegatee-membership-id" type="text" value={delegateeMembershipId} onChange={(event) => setDelegateeMembershipId(event.target.value)} /></div>
                <div className={styles.actions}><button className="button button-secondary" type="button" onClick={setDelegation} disabled={!delegateeMembershipId || pendingAction !== null}>Set direct delegation</button>{selectedCompact.delegation ? <button className="button button-secondary" type="button" onClick={clearDelegation} disabled={pendingAction !== null}>Revoke delegation</button> : null}</div>
              </div>
            ) : <p data-testid="no-active-compact-ballot">No funding-qualified voting snapshot is active. No vote or delegation target is fabricated.</p>}
          </aside>
        </div>
      ) : null}
    </>
  );
}
