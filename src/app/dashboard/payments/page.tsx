import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { DashboardTools } from "@/components/dashboard/dashboard-tools";
import { PaymentSubmit } from "@/components/payments/payment-submit";
import { requireViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { ACCOUNT_PAYMENTS_PATH, AccountPaymentError, PAYMENT_METHOD_CONSENT } from "@/lib/payments/account-payment-policy";
import { accountPayments } from "@/lib/payments/account-payments";
import { addPaymentMethodAction, removePaymentMethodAction, setupReceivingAction, refreshReceivingAction, manageReceivingAction } from "./actions";
import styles from "./payments.module.css";

export const metadata: Metadata = { title: "Payment methods & receiving", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const failure = (error: unknown) => error instanceof AccountPaymentError ? error.message : "We could not load these settings from Stripe. Please try again or contact support.";

export default async function PaymentsPage({ searchParams }: Props) {
  const viewer = await requireViewer(ACCOUNT_PAYMENTS_PATH);
  const params = await searchParams;
  const actor = { id: viewer.authUser.id, email: viewer.authUser.email, name: viewer.displayName };
  let available = false;
  let live = false;
  let configurationError = "";
  let methodError = "";
  let receiveError = "";
  let notice = "";
  let countries: string[] = [];
  let saved: Awaited<ReturnType<Awaited<ReturnType<typeof accountPayments>>["service"]["methods"]>> = { methods: [], atLimit: false };
  let receiving: Awaited<ReturnType<Awaited<ReturnType<typeof accountPayments>>["service"]["receiveOverview"]>> = null;
  try {
    const api = await accountPayments();
    live = api.livemode; available = true;
    const results = await Promise.allSettled([api.service.methods(actor), api.service.receiveOverview(actor), api.countries()]);
    if (results[0].status === "fulfilled") saved = results[0].value; else methodError = failure(results[0].reason);
    if (results[1].status === "fulfilled") receiving = results[1].value; else receiveError = failure(results[1].reason);
    if (results[2].status === "fulfilled") countries = results[2].value;
    const session = first(params.setup_session_id);
    if (session) {
      try {
        notice = await api.service.setupResult(actor, session) === "saved"
          ? "Stripe confirmed that your payment method was saved. No payment was charged."
          : "Stripe has not confirmed this setup yet. Refresh to check again.";
      } catch (error) { methodError = failure(error); }
    }
  } catch (error) { configurationError = failure(error); }
  const flow = first(params.flow);
  if (!notice && flow === "cancelled") notice = "You returned without completing this setup. Review your saved methods below.";
  if (!notice && flow === "receive-refresh") notice = "Your Stripe setup link expired. Continue setup below to get a new link.";
  if (!notice && flow === "receive-return") notice = "You returned from Stripe. Review your status below, then refresh receiving status to sync your account.";
  const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

  return <div className={styles.page}>
    <SiteTopbar brandHref="/" links={getPrimaryNavLinks(true)} {...getTopbarActions(true)} showSearch={false} showLogout />
    <DashboardTools active="payments" />
    <main id="main-content" className={styles.content} tabIndex={-1}>
      <header className={styles.heading}>
        <Link href="/dashboard" prefetch={false}>Back to Profile</Link>
        <h1>Payment methods & receiving</h1>
        <p>Add a way to pay, or set up where you receive money.</p>
        {available && !live ? <p className={styles.notice}><strong>Test mode.</strong> Use Stripe test details only. No live payment methods or payouts.</p> : null}
      </header>
      {configurationError ? <p role="alert" className={styles.notice}>{configurationError} <Link href="/contact">Contact support</Link></p> : null}
      {first(params.error) ? <p role="alert" className={styles.notice}>{first(params.error)?.slice(0, 240)}</p> : null}
      {notice ? <p role="status" className={styles.notice}>{notice}</p> : null}

      <section id="payment-methods" className={styles.card} aria-labelledby="payment-methods-heading">
        <div className={styles.cardHeading}><h2 id="payment-methods-heading">Payment methods</h2><span>For paying</span></div>
        <p>Stripe stores your payment details. Adding a method does not charge you or authorize a trade.</p>
        {methodError ? <p role="alert">{methodError}</p> : available ? <>
          {saved.methods.length ? <ul className={styles.methods}>{saved.methods.map((method) => <li key={method.id}>
            <div><strong>{method.label}</strong>{method.expiry ? <span>Expires {method.expiry}</span> : null}</div>
            <details className={styles.remove}><summary>Remove</summary>
              <form action={removePaymentMethodAction}>
                <input type="hidden" name="payment_method_id" value={method.id} />
                <label><input type="checkbox" name="confirm_remove" required /> Remove this saved method. Existing trade authorizations are separate.</label>
                <PaymentSubmit pendingLabel="Removing…">Remove method</PaymentSubmit>
              </form>
            </details>
          </li>)}</ul> : <div className={styles.empty}>No payment methods saved.</div>}
          {saved.atLimit ? <p>Remove an unused method before adding another.</p> : <form action={addPaymentMethodAction} className={styles.setupForm}>
            <input type="hidden" name="request_id" value={randomUUID()} />
            <label className={styles.consent}><input type="checkbox" name="save_consent" required /><span>{PAYMENT_METHOD_CONSENT}</span></label>
            <PaymentSubmit>Add payment method</PaymentSubmit>
          </form>}
        </> : <p>Payment-method setup is currently unavailable.</p>}
      </section>

      <section id="receive-payments" className={styles.card} aria-labelledby="receive-payments-heading">
        <div className={styles.cardHeading}><h2 id="receive-payments-heading">Receive payments</h2><span>For receiving</span></div>
        <p>Add your payout details and complete identity verification on Stripe—not on Moral Trade.</p>
        {receiveError ? <p role="alert">{receiveError}</p> : available ? <>
          {receiving ? <>
            <p className={styles.status}>{receiving.status}</p>
            {receiving.methods.length ? <ul className={styles.methods}>{receiving.methods.map((method, index) => <li key={index}><strong>{method.label}</strong><span>{method.currency}</span></li>)}</ul> : <div className={styles.empty}>No payout method returned by Stripe. Continue setup to review your details.</div>}
            {receiving.hasMore ? <p>Open Stripe to view all payout methods.</p> : null}
            <div className={styles.actions}>
              <form action={refreshReceivingAction}><PaymentSubmit pendingLabel="Refreshing…">Refresh receiving status</PaymentSubmit></form>
              {receiving.status !== "Stripe setup complete" ? <form action={setupReceivingAction}><PaymentSubmit>Continue setup</PaymentSubmit></form> : null}
              {receiving.canManage ? <form action={manageReceivingAction}><PaymentSubmit>Manage payout methods</PaymentSubmit></form> : <p>Manage this account in your Stripe dashboard.</p>}
            </div>
          </> : countries.length ? <form action={setupReceivingAction} className={styles.setupForm}>
            <label htmlFor="payout-country">Your country or business registration country</label>
            <select id="payout-country" name="country" required defaultValue=""><option value="" disabled>Select your country</option>{countries.map((code) => <option key={code} value={code}>{countryNames.of(code) ?? code}</option>)}</select>
            <p className={styles.small}>Availability depends on Stripe’s country and platform requirements.</p>
            <PaymentSubmit>Set up receiving payments</PaymentSubmit>
          </form> : <p>Country options could not be loaded. Please refresh or contact support.</p>}
          <p className={styles.small}>Stripe approval and each trade’s payment checks still apply. Completing setup does not transfer money.</p>
        </> : <p>Receiving-payment setup is currently unavailable.</p>}
      </section>
      <p className={styles.footerNote}>Trade-specific authorizations remain separate. Removing a method saved here does not cancel an existing trade or its payment authorization.</p>
      <Link href={ACCOUNT_PAYMENTS_PATH} prefetch={false}>Refresh payment settings</Link>
    </main>
  </div>;
}
