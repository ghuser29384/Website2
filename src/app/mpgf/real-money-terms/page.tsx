import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { MPGF_COPY } from "@/lib/mpgf/data";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Real-Money Terms",
  description: "Terms, refund, and payment-state notices for real-money MPGF contributions.",
  alternates: {
    canonical: "/mpgf/real-money-terms",
  },
  openGraph: {
    title: "MPGF Real-Money Terms",
    description: "Terms, refund, and payment-state notices for real-money MPGF contributions.",
    url: getAbsoluteUrl("/mpgf/real-money-terms"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfRealMoneyTermsPage() {
  const viewer = await getViewer();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/contribute">Return to contribution flow</Link>}
      description="Read the payment, refund, allocation, privacy, and payout/compliance notices before using real-money MPGF Checkout."
      title="MPGF real-money terms."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <div className="mpgf-workflow-grid">
          <article className="mpgf-panel">
            <p className="eyebrow">Payment status</p>
            <h2>Stripe Checkout records payment provider state</h2>
            <p>{MPGF_COPY.realMoneyContribution}</p>
            <p>
              A contribution is recorded in MPGF only after a Stripe webhook confirms payment state.
              A Checkout success redirect is not by itself final payment confirmation.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Disclaimers</p>
            <h2>No tax, escrow, or outcome guarantee</h2>
            <ul className="mpgf-check-list">
              <li>{MPGF_COPY.not_tax_advice}</li>
              <li>{MPGF_COPY.tax_deductibility_disabled_by_default}</li>
              <li>{MPGF_COPY.not_escrow}</li>
              <li>{MPGF_COPY.not_guaranteed_effectiveness}</li>
            </ul>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Manual evidence</p>
            <h2>External payments require review</h2>
            <p>{MPGF_COPY.manualExternalPaymentEvidence}</p>
            <p>
              Open Collective, fiscal-host, bank-transfer, PayPal, or other external evidence is
              treated as participant-submitted evidence until an MPGF reviewer verifies destination,
              amount, timing, and policy fit.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Refunds</p>
            <h2>Refunds require review</h2>
            <p>
              Refund availability depends on Stripe payment state, cycle timing, chargeback/dispute
              status, and the published MPGF refund policy. Participants can request review from
              their contribution-state page.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Payout gates</p>
            <h2>Allocation is separate from disbursement</h2>
            <p>{MPGF_COPY.realMoneyTerms}</p>
            <p>
              Recipient accreditation, compliance review, payout-profile approval, and manual or
              automated payout evidence must pass before any external disbursement is treated as
              complete.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Compliance screening</p>
            <h2>AML/KYC and sanctions checks are production gates</h2>
            <p>
              Before real-money MPGF payout or sponsor-pool release, the custody, receipt, and
              payout partner must complete AML/KYC or KYB screening, sanctions screening, recipient
              accreditation, and any required charitable-solicitation review.
            </p>
            <p>
              Moral Trade records aggregate readiness and provider event state only. Screening
              outcomes are not donor moral reputation signals and cannot alter the current round
              allocation formula.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Partner legal readiness</p>
            <h2>External approval is required before money movement</h2>
            <p>
              Production real-money mode remains blocked until partner-held custody, receipt
              wording, refund terms, Stripe webhook controls, Every.org or fiscal-sponsor routing,
              and jurisdiction-specific legal review are approved.
            </p>
            <p>
              The default architecture is non-custodial: Every.org or fiscal-sponsor fast routes
              for donations, Stripe SetupIntent saved commitments for conditional participation,
              and PaymentIntents only after threshold, review, and challenge gates clear.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Monthly billing</p>
            <h2>Subscriptions are managed through Stripe Billing</h2>
            <p>
              Monthly MPGF contributions use Stripe Billing through Checkout subscription mode.
              Future charges can be managed through the Stripe Billing portal when a Stripe customer
              exists for the signed-in participant.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Privacy</p>
            <h2>Public summaries are filtered</h2>
            <p>{MPGF_COPY.privacy_visibility}</p>
          </article>
        </div>
      </section>
    </MpgfPageFrame>
  );
}
