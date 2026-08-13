import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { MpgfPublicGoodsCompacts } from "@/components/mpgf/mpgf-public-goods-compacts";
import { getViewer } from "@/lib/app-data";
import { loadMpgfPublicGoodsCompactsState } from "@/lib/mpgf/public-goods-compacts-server";
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
      "Cause-specific constitutional compacts that become binding only after their accepted-member threshold is reached.",
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
      description="Choose a cause-specific constitution voluntarily. Acceptance stays revocable while recruiting and becomes binding only if 5,000 accepted members activate and freeze the charter. No action here moves money."
      eyebrow="Opt-in public-goods compacts"
      modeItems={[
        "Voluntary cause selection",
        "5,000-member activation",
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
              <dd>Freeze the charter and start the 12-month term</dd>
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
            Recruiting acceptances are durable but immediately revocable. Reaching 5,000 accepted
            members atomically freezes the founding constitution and starts the 12-month minimum
            term. One-member-one-credit allocation, revocable delegation, independent review,
            additionality checks, recusals, minority protections, and public post-round reporting
            then govern project selection.
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
