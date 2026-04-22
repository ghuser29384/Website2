import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Moral Trade structures offers, reasoning standards, matching, and verification.",
  alternates: {
    canonical: "/methodology",
  },
};

export default async function MethodologyPage() {
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className="legal-page">
        <p className="eyebrow">Methodology</p>
        <h1>How Moral Trade structures reasoning</h1>
        <p>
          The interface asks participants to state the cause area, action, requested counterpart,
          expected impact, verification method, duration, payment cadence if relevant, and exit
          conditions.
        </p>
        <section className="panel data-card data-card-wide">
          <h2>Offer structure</h2>
          <p>
            Each offer separates what one side will do from what it asks another person to do. This
            keeps pledge swaps, donation offsets, and payment-mediated action offers legible.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Matching</h2>
          <p>
            Current match suggestions are rule-based. They use stated cause areas, compatibility
            with payment or pledges, shared terms, and consent-gated previews rather than AI
            inference.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Verification</h2>
          <p>
            Agreement events let participants record evidence, counterproposals, disputes, and
            payment updates. The goal is disciplined review rather than engagement-maximizing
            discourse.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

