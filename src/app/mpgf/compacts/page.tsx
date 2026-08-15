import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { MpgfPublicGoodsCompacts } from "@/components/mpgf/mpgf-public-goods-compacts";
import { getViewer } from "@/lib/app-data";
import { loadMpgfPublicGoodsCompactsState } from "@/lib/mpgf/public-goods-compacts-service";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Voluntary Public-Goods Compacts | Moral Trade",
  description:
    "Review transaction-based Compact v2: one aggregate uncapped obligation, exact cause allocation, settlement-based qualification, and no automatic collection.",
  alternates: {
    canonical: "/mpgf/compacts",
  },
  openGraph: {
    title: "Voluntary Public-Goods Compacts | Moral Trade",
    description:
      "Cause-specific Compact v2 constitutions with transaction-based qualification and fail-closed activation gates.",
    url: getAbsoluteUrl("/mpgf/compacts"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfCompactsPage() {
  const [viewer, state] = await Promise.all([
    getViewer(),
    loadMpgfPublicGoodsCompactsState(),
  ]);

  return (
    <MpgfPageFrame
      actions={
        <>
          <a className="button button-primary" href="#founding-compacts">
            Review founding compacts
          </a>
          <Link className="button button-secondary" href="/mpgf">
            Back to Public Goods Fund
          </Link>
        </>
      }
      description="Join one or more cause-specific constitutions voluntarily. Compact v2 derives one uncapped obligation from authoritative prior-month net-settled outflow, requires an exact allocation, and remains activation-blocked. No action here moves money."
      eyebrow="Opt-in public-goods compacts"
      modeItems={[
        "Voluntary cause selection",
        "100 people + $500 numerical readiness",
        "Activation blocked by operational gates",
        "Automatic collection disabled",
      ]}
      participationPanel={
        <>
          <p className="eyebrow">How compact participation works</p>
          <dl>
            <div>
              <dt>1. Choose voluntarily</dt>
              <dd>No assignment and no government taxing authority</dd>
            </div>
            <div>
              <dt>2. Accept while recruiting</dt>
              <dd>Immediately revocable and not yet binding</dd>
            </div>
            <div>
              <dt>3. Reach numerical readiness</dt>
              <dd>100 verified people and $500 planned in one frozen snapshot</dd>
            </div>
            <div>
              <dt>Collection state</dt>
              <dd>Disabled; no action here moves money</dd>
            </div>
          </dl>
        </>
      }
      title="Coordinate by constitution, not taxation."
      viewerPresent={Boolean(viewer)}
    >
      <nav className="hub-tabs" aria-label="Public-goods compact sections">
        <a href="#founding-compacts">Founding compacts</a>
        <a href="#compact-lifecycle">Lifecycle</a>
        <Link href="/mpgf">MPGF hub</Link>
        <Link href="/mpgf/governance">Governance</Link>
        <Link href="/mpgf/technical-spec">Technical spec</Link>
      </nav>

      <section
        className="section section-white"
        id="founding-compacts"
        aria-labelledby="compact-boundaries-heading"
      >
        <div className="section-head section-head-compact">
          <p className="eyebrow">Constitutional boundary</p>
          <h2 id="compact-boundaries-heading">
            A voluntary compact is not a government jurisdiction.
          </h2>
          <p>
            Moral Trade has no government taxing authority. Users are never randomly assigned,
            and Compact v2 adds no platform-wide marketplace tax or checkout surcharge. A
            voluntarily joined Compact separately calculates one later aggregate monthly
            obligation from eligible prior-month Moral Trade net-settled outflow. A member may
            choose multiple cause-specific Compacts while all of them share that one aggregate
            monthly obligation.
          </p>
          <p>
            <strong>Joining after activation:</strong> if a compact is already active, accepting its
            frozen constitution makes the membership immediately binding only as a
            platform-governance commitment under the Compact. Joining does not itself create a
            legal debt, unilateral charge, payment authorization, enforceable liability,
            settlement, custody relationship, or collection. Exit remains prospective under the
            published minimum-term and notice rules.
          </p>
        </div>
        <MpgfPublicGoodsCompacts state={state} viewerPresent={Boolean(viewer)} />
      </section>

      <section
        className="section section-subtle"
        id="compact-lifecycle"
        aria-labelledby="compact-lifecycle-heading"
      >
        <div className="section-head section-head-compact">
          <p className="eyebrow">Lifecycle in plain language</p>
          <h2 id="compact-lifecycle-heading">Recruit, activate once, govern, then report.</h2>
          <p>
            Recruiting memberships are durable but immediately revocable. Numerical readiness
            requires 100 funding-qualified verified people and $500 planned in the same frozen
            snapshot, but cannot activate while identity, legal, payment, provider, and production
            release gates remain unmet. A frozen voting cycle uses 70% equal weight and 30%
            square-root net-settled contribution weight, with direct-only delegation capped at 10%.
          </p>
        </div>
        <div className="section-actions">
          <Link className="button button-secondary" href="/mpgf/governance">
            Review MPGF governance
          </Link>
          <Link className="button button-secondary" href="/mpgf/real-money-terms">
            Review payment boundaries
          </Link>
        </div>
      </section>
    </MpgfPageFrame>
  );
}
