import type { Metadata } from "next";
import Link from "next/link";

import { DealReceipt, type DealReceiptRow } from "@/components/marketplace/deal-receipt";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Create",
  description:
    "Choose whether to trade commitments, redirect offsetting donations, join a conditional pool, or request career-impact backing.",
  alternates: { canonical: "/create" },
  openGraph: {
    title: "Create a Moral Trade",
    description:
      "Choose a concrete coordination route, state the no-deal default, and review complete terms before authorization.",
    url: getAbsoluteUrl("/create"),
    type: "website",
  },
};

type CreateMode = "trade" | "offset" | "pool" | "back";

interface CreatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const createModes = [
  {
    key: "trade" as const,
    index: "01",
    title: "Trade",
    summary: "Exchange actions or commitments that each side values differently.",
    detail: "I will do X if you do Y.",
    target: "/offers/new?entry=draft&mode=pledge",
    cta: "Draft a trade",
    later: false,
  },
  {
    key: "offset" as const,
    index: "02",
    title: "Offset",
    summary: "Redirect a matched amount of two opposed planned donations.",
    detail: "We redirect the matched amount to something we both value.",
    target: "/offers/new?entry=draft&mode=offset",
    cta: "Draft an offset",
    later: false,
  },
  {
    key: "pool" as const,
    index: "03",
    title: "Pool",
    summary: "Pledge up to a maximum and fund only when a published condition passes.",
    detail: "Charge me only if enough support joins by the deadline.",
    target: "/pools",
    cta: "Explore pools",
    later: false,
  },
  {
    key: "back" as const,
    index: "04",
    title: "Back",
    summary: "Help close a compensation gap for a more impactful path.",
    detail: "Backers conditionally fund part of the gap under reviewed terms.",
    target: "/background-networking",
    cta: "Request review",
    later: true,
  },
] as const;

const createFlow = [
  ["01", "Default", "State what happens without this proposal."],
  ["02", "Terms", "Bound the action, amount, duration, condition, and exit."],
  ["03", "Evidence", "Name what will demonstrate performance and who reviews it."],
  ["04", "Receipt", "Inspect the complete Deal Receipt before relying on the proposal."],
  ["05", "Authorize", "Move to an authorization state only when the relevant gates pass."],
] as const;

function readMode(value: string | string[] | undefined): CreateMode {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved === "offset" || resolved === "pool" || resolved === "back" ? resolved : "trade";
}

function buildTargetHref(isAuthenticated: boolean, target: string) {
  if (target === "/pools" || target === "/background-networking") {
    return target;
  }

  return isAuthenticated ? target : `/signup?returnTo=${encodeURIComponent(target)}`;
}

function previewRows(mode: CreateMode): readonly DealReceiptRow[] {
  const modeCopy: Record<CreateMode, { commitment: string; condition: string; other: string }> = {
    trade: {
      commitment: "Your exact offered action, amount, or bounded service.",
      other: "The counterparty action you request in exchange.",
      condition: "Both sides accept the frozen terms.",
    },
    offset: {
      commitment: "Your matched redirect amount and original intended destination.",
      other: "The counterparty matched redirect amount and opposed destination.",
      condition: "Both baselines, the shared destination, and settlement rules pass review.",
    },
    pool: {
      commitment: "A named maximum pledge; not an unlimited or immediate donation.",
      other: "The aggregate commitments required from the rest of the pool.",
      condition: "The threshold and published gates pass by the deadline.",
    },
    back: {
      commitment: "A capped contribution toward the reviewed compensation gap.",
      other: "The candidate accepts the higher-impact path and its evidence terms.",
      condition: "The offer, salary gap, role, and impact commitment pass review.",
    },
  };
  const copy = modeCopy[mode];

  return [
    { label: "Without this deal", value: "The explicit status quo you state before drafting." },
    { label: "Your commitment", value: copy.commitment },
    { label: "Other commitments", value: copy.other },
    { label: "Condition", value: copy.condition },
    { label: "Maximum exposure", value: "Visible before authorization.", emphasis: true },
    { label: "Evidence", value: "Named evidence, reviewer, deadline, and privacy scope." },
    { label: "Exit", value: "Cancellation, expiry, challenge, and reversal rules." },
  ];
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const selectedMode = readMode(resolvedSearchParams.mode);
  const isAuthenticated = Boolean(viewer);

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Create safely</span>
        <span>A draft is not a commitment. Authorization and settlement are separate states.</span>
        <Link href="/trust">Trust rules</Link>
      </div>

      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showSearch={false}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-product-main" id="main-content" tabIndex={-1}>
        <section className="mt-create-hero" aria-labelledby="create-heading">
          <div className="mt-create-copy">
            <p className="mt-product-kicker">Create</p>
            <h1 id="create-heading">What are you trying to coordinate?</h1>
            <p>
              Start with the public verb, not the mechanism-design taxonomy. You will still see the
              baseline, maximum exposure, evidence, settlement, externality, and exit terms before
              anything can become active.
            </p>
          </div>
          <div className="mt-create-preview">
            <DealReceipt
              note="Preview only. The values shown here describe the fields you will complete, not a live agreement."
              rows={previewRows(selectedMode)}
              state="Draft"
              title={`${createModes.find((mode) => mode.key === selectedMode)?.title ?? "Trade"} preview`}
            />
          </div>
        </section>

        <section className="mt-product-section is-white" aria-labelledby="create-modes-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Choose a route</p>
              <h2 id="create-modes-heading">Four verbs. One terms system.</h2>
            </div>
            <p>
              Trade, Offset, and Pool are the primary product lanes. Back is visible as a later,
              higher-review lane rather than competing for first-use attention.
            </p>
          </div>

          <div className="mt-create-modes">
            {createModes.map((mode) => (
              <Link
                className={[
                  "mt-create-mode",
                  mode.key === selectedMode ? "is-selected" : "",
                  mode.later ? "is-later" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                href={buildTargetHref(isAuthenticated, mode.target)}
                key={mode.key}
              >
                <small>
                  {mode.index} / {mode.later ? "Later lane" : "Available"}
                </small>
                <div>
                  <h2>{mode.title}</h2>
                  <p>{mode.summary}</p>
                </div>
                <div>
                  <p><strong>{mode.detail}</strong></p>
                  <span>{mode.cta} ↗</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-product-section" aria-labelledby="create-flow-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">The creation flow</p>
              <h2 id="create-flow-heading">Make the default explicit first.</h2>
            </div>
            <p>
              The interface should make a proposal easier to understand without hiding the parts
              that determine whether it is voluntary, additional, reviewable, and safe.
            </p>
          </div>
          <ol className="mt-create-flow">
            {createFlow.map(([number, title, description]) => (
              <li key={number}>
                <span>{number}</span>
                <strong>{title}</strong>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
