import type { Metadata } from "next";
import Link from "next/link";

import { BackingCreateForm } from "@/components/backing/backing-create-form";
import backStyles from "@/components/backing/backing-create.module.css";
import { CreateRouteChooser } from "@/components/create/create-route-chooser";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { DealReceipt, type DealReceiptRow } from "@/components/marketplace/deal-receipt";
import { getViewer } from "@/lib/app-data";
import { getCreateRoute, readCreateMode } from "@/lib/create-routes";
import { getFormMessage } from "@/lib/form-state";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface CreatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const BACKING_PRINCIPLES = [
  {
    index: "01",
    title: "Close a gap, not write a blank cheque.",
    detail:
      "The review distinguishes the verified compensation gap from the smaller maximum backing request and its fixed term.",
  },
  {
    index: "02",
    title: "Review the path, not just the salary.",
    detail:
      "A higher-impact claim needs a specific role or project, a no-deal baseline, evidence, uncertainty, and an accountable reviewer.",
  },
  {
    index: "03",
    title: "Keep authorization separate.",
    detail:
      "Submitting this page creates a private review request only. A later frozen term sheet would still require separate participant authorization.",
  },
] as const;

const BACKING_SAFEGUARDS = [
  {
    index: "01",
    title: "Voluntary",
    detail:
      "The candidate may decline before authorization without retaliation, unrelated loss, or surprise disclosure.",
  },
  {
    index: "02",
    title: "Bounded",
    detail:
      "Every proposal needs a hard cap, term, clearing condition, expiry, and explicit failure state.",
  },
  {
    index: "03",
    title: "Reviewed",
    detail:
      "Compensation evidence, impact claims, reviewer authority, conflicts, and privacy scope are checked before reliance.",
  },
  {
    index: "04",
    title: "Reversible",
    detail:
      "Exit rules distinguish future obligations from completed periods and define what happens when the role or evidence changes.",
  },
] as const;

function buildBackPreviewRows(): readonly DealReceiptRow[] {
  const route = getCreateRoute("back");

  return [
    { label: "Without this deal", value: route.receipt.baseline },
    { label: "Backer commitment", value: route.receipt.commitment },
    { label: "Candidate commitment", value: route.receipt.other },
    { label: "Condition", value: route.receipt.condition },
    { label: "Most this can cost", value: route.receipt.exposure, emphasis: true },
    { label: "Evidence", value: route.receipt.evidence },
    { label: "Exit", value: route.receipt.exit },
  ];
}

export async function generateMetadata({ searchParams }: CreatePageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const mode = readCreateMode(resolvedSearchParams.mode);

  if (mode === "back") {
    return {
      title: "Draft career-impact backing",
      description:
        "Draft a private, capped, conditional career-impact backing request with an explicit baseline, evidence plan, review, and exit terms.",
      alternates: { canonical: "/create?mode=back" },
      openGraph: {
        title: "Draft career-impact backing | Moral Trade",
        description:
          "Close a reviewed compensation gap without creating an open-ended obligation or moving funds at draft stage.",
        url: getAbsoluteUrl("/create?mode=back"),
        type: "website",
      },
    };
  }

  return {
    title: "Create",
    description:
      "Compare Moral Trade creation routes, inspect the required baseline and safety terms, and continue to a non-binding draft.",
    alternates: { canonical: "/create" },
    openGraph: {
      title: "Create a Moral Trade",
      description:
        "Choose a concrete coordination route, state the no-deal default, and review complete terms before authorization.",
      url: getAbsoluteUrl("/create"),
      type: "website",
    },
  };
}

function BackCreateRoute({
  formMessage,
  isAuthenticated,
  viewerName,
}: {
  formMessage: ReturnType<typeof getFormMessage>;
  isAuthenticated: boolean;
  viewerName: string | null;
}) {
  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Reviewed backing</span>
        <span>No funds move and no job or impact claim is certified at draft stage.</span>
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
        <section className={backStyles.hero} aria-labelledby="back-create-heading">
          <div className={backStyles.heroCopy}>
            <p className="mt-product-kicker">Back</p>
            <h1 id="back-create-heading">Close a verified compensation gap.</h1>
            <p className={backStyles.heroBody}>
              Draft a capped, conditional backing request for a person choosing a plausibly
              higher-impact path. State the no-deal default, gap, activation condition, evidence,
              reviewer, privacy scope, and exit terms before anyone is asked to pledge.
            </p>
            <div className={backStyles.heroActions}>
              <a className="button button-primary" href="#backing-intake">
                Draft reviewed request
              </a>
              <Link className="button button-secondary" href="/create">
                Choose another route
              </Link>
            </div>
            <ul className={backStyles.heroMeta} aria-label="Backing draft boundaries">
              <li>Private intake</li>
              <li>Hard cap required</li>
              <li>Separate authorization</li>
            </ul>
            {viewerName ? (
              <p className={backStyles.viewerLine}>
                Signed in as <strong>{viewerName}</strong>.
              </p>
            ) : null}
          </div>
          <div className={backStyles.heroReceipt}>
            <DealReceipt
              note="Preview only. The final record must name the verified gap, funding threshold, reviewer, evidence, privacy scope, and exit rule."
              rows={buildBackPreviewRows()}
              state="Draft"
              title="Back preview"
            />
          </div>
        </section>

        <section
          className={`${backStyles.section} ${backStyles.sectionWhite}`}
          aria-labelledby="backing-principles-heading"
        >
          <div className={backStyles.sectionHeader}>
            <div>
              <p className="mt-product-kicker">What this lane does</p>
              <h2 id="backing-principles-heading">Make the counterfactual and the cap legible.</h2>
            </div>
            <p>
              Career-impact backing can be mutually beneficial when a compensation difference is a
              real blocker. It becomes unsafe when the baseline is vague, the obligation is
              open-ended, or financial dependence is used as pressure.
            </p>
          </div>
          <div className={backStyles.principleGrid}>
            {BACKING_PRINCIPLES.map((principle) => (
              <article className={backStyles.principle} key={principle.index}>
                <span>{principle.index}</span>
                <h3>{principle.title}</h3>
                <p>{principle.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className={`${backStyles.section} ${backStyles.sectionMuted}`}
          id="backing-intake"
          aria-labelledby="backing-intake-heading"
        >
          <div className={backStyles.sectionHeader}>
            <div>
              <p className="mt-product-kicker">Reviewed request</p>
              <h2 id="backing-intake-heading">Draft the record an operator can actually review.</h2>
            </div>
            <p>
              Exact salary, offer, identity, and contact details stay private by default. The first
              submission enters an operator queue; it does not publish a campaign or contact a
              candidate or backer.
            </p>
          </div>
          <BackingCreateForm formMessage={formMessage} isAuthenticated={isAuthenticated} />
        </section>

        <section
          className={`${backStyles.section} ${backStyles.sectionWhite}`}
          aria-labelledby="backing-safeguards-heading"
        >
          <div className={backStyles.sectionHeader}>
            <div>
              <p className="mt-product-kicker">Safeguards</p>
              <h2 id="backing-safeguards-heading">
                A funding gap is not permission to create pressure.
              </h2>
            </div>
            <p>
              Review should protect candidate autonomy, surface conflicts, and prevent the backing
              arrangement from turning into an indefinite employment, loyalty, or access claim.
            </p>
          </div>
          <div className={backStyles.safeguardGrid}>
            {BACKING_SAFEGUARDS.map((safeguard) => (
              <article className={backStyles.safeguard} key={safeguard.index}>
                <span>{safeguard.index}</span>
                <h3>{safeguard.title}</h3>
                <p>{safeguard.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const selectedMode = readCreateMode(resolvedSearchParams.mode);
  const isAuthenticated = Boolean(viewer);

  if (selectedMode === "back") {
    return (
      <BackCreateRoute
        formMessage={getFormMessage(resolvedSearchParams)}
        isAuthenticated={isAuthenticated}
        viewerName={viewer?.displayName ?? null}
      />
    );
  }

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
        <CreateRouteChooser initialMode={selectedMode} isAuthenticated={isAuthenticated} />
      </main>

      <SiteFooter />
    </div>
  );
}
