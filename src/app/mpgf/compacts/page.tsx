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
    "Review and voluntarily accept a cause-specific public-goods compact with a frozen constitution, activation threshold, capped contribution rule, and no automatic collection.",
  alternates: {
    canonical: "/mpgf/compacts",
  },
  openGraph: {
    title: "Voluntary Public-Goods Compacts | Moral Trade",
    description:
      "Cause-specific constitutional compacts with a qualifying-acceptance threshold, a separate identity-integrity gate, and no automatic collection.",
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
      description="Choose a cause-specific constitution voluntarily. Acceptance stays revocable while recruiting and can become binding only after 5,000 qualifying acceptances and a separately verified person-unique identity gate. No action here moves money."
      eyebrow="Opt-in public-goods compacts"
      modeItems={[
        "Voluntary cause selection",
        "5,000 qualifying acceptances plus identity gate",
        "Constitution frozen at activation",
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
              <dt>3. Activate at threshold</dt>
              <dd>First verify the person-unique identity release gate</dd>
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
            and the ordinary marketplace remains untaxed. A member chooses one cause-specific
            compact and accepts its published constitution before any obligation can arise.
          </p>
          <p>
            <strong>Joining after activation:</strong> if a compact is already active, accepting its
            frozen constitution makes the membership binding immediately. Exit remains
            prospective under the published minimum-term and notice rules.
          </p>
          <p>
            <strong>Legal and identity boundary:</strong> joining alone is not represented as a
            legally enforceable debt or provider payment mandate. Counts are currently unique by
            account/profile, not verified person, so automatic activation remains blocked until a
            separately approved one-person-one-account and Sybil-resistance policy is integrated.
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
            Recruiting acceptances are durable but immediately revocable. A zero-dollar schedule
            cannot join or count toward the threshold. Reaching 5,000 qualifying acceptances does
            not activate while the person-unique identity gate is blocked; after that gate is
            separately verified, activation atomically freezes the founding constitution and
            starts the 12-month minimum term. One-member-one-credit allocation, revocable
            delegation, independent review, additionality checks, recusals, minority protections,
            and public post-round reporting then govern project selection.
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
