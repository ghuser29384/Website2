import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { getMoralTradeFundingReadiness } from "@/lib/funding";
import { MPGF_COPY } from "@/lib/mpgf/data";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Funding Terms",
  description:
    "External-provider, fiscal-sponsor, receipt, refund, evidence, and non-custody notices for MPGF contribution routes.",
  alternates: {
    canonical: "/mpgf/real-money-terms",
  },
  openGraph: {
    title: "MPGF Funding Terms",
    description:
      "Review the external-provider and fiscal-sponsor boundaries that apply before an MPGF contribution can count.",
    url: getAbsoluteUrl("/mpgf/real-money-terms"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfRealMoneyTermsPage() {
  const viewer = await getViewer();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();
  const funding = getMoralTradeFundingReadiness();
  const sponsor = funding.sponsor;

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/contribute">Return to contribution flow</Link>}
      description="Read the provider, sponsor, receipt, refund, allocation, privacy, and compliance notices before relying on any MPGF funding record."
      title="MPGF funding terms."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <div className="mpgf-workflow-grid">
          <article className="mpgf-panel">
            <p className="eyebrow">Current payment posture</p>
            <h2>External providers remain the payment source of truth</h2>
            <p>{MPGF_COPY.realMoneyContribution}</p>
            <p>
              A direct-to-charity gift is recorded in MPGF only after an Every.org provider event or
              reviewed evidence confirms the transaction. A redirect or success page is not final
              payment confirmation.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Fiscal sponsorship</p>
            <h2>{sponsor ? "The active sponsor must remain fully disclosed" : "No sponsor-backed project route is active"}</h2>
            {sponsor ? (
              <ul className="mpgf-check-list">
                <li>Legal recipient: {sponsor.legalName}</li>
                <li>Jurisdiction: {sponsor.jurisdiction}</li>
                <li>Fee: {sponsor.feeDisclosure}</li>
                <li>Tax receipts: {sponsor.taxReceiptDisclosure}</li>
              </ul>
            ) : (
              <p>
                Moral Trade is not accepting funds for its own operations. A contribution button for
                project support remains unavailable until a sponsor contract and all required public
                disclosures are configured.
              </p>
            )}
            <Link className="inline-link" href="/support">
              Review current support routes
            </Link>
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
              Every.org, fiscal-sponsor, bank-transfer, PayPal, or other external evidence is treated
              as participant-submitted evidence until an MPGF reviewer verifies destination, amount,
              timing, and policy fit.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Refunds</p>
            <h2>The provider or sponsor controls the refund process</h2>
            <p>
              Refund availability depends on the external provider or fiscal sponsor, transaction
              status, applicable law, and the policy disclosed at payment. MPGF can record a refund
              state but cannot promise or execute a refund for funds it never held.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Payout gates</p>
            <h2>Allocation is separate from disbursement</h2>
            <p>{MPGF_COPY.realMoneyTerms}</p>
            <p>
              Recipient accreditation, compliance review, payout approval, and external disbursement
              evidence must pass before a payment is represented as complete.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Compliance screening</p>
            <h2>AML, KYC, KYB, sanctions, and charity-law checks remain external gates</h2>
            <p>
              The custody, receipt, and payout partner must perform the screening required for its
              role and jurisdiction. Moral Trade records readiness and provider-event state only; it
              does not convert compliance outcomes into moral reputation signals.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Recurring support</p>
            <h2>Monthly project support is disabled until a sponsor approves the route</h2>
            <p>
              A monthly pledge in MPGF is not a subscription or charge. Recurring project support
              becomes available only through a sponsor-approved external contribution page whose
              cancellation and refund terms are displayed before payment.
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
