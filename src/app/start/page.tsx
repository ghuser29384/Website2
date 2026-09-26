import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";

import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getStartCreateHref, START_PATHS } from "@/lib/start-paths";

import styles from "./start.module.css";

const description = "Browse trades, create a proposal, make a donation, or explore funding pools.";

export const metadata: Metadata = {
  title: "Get started",
  description,
  alternates: { canonical: "/start" },
  openGraph: {
    title: "Get started | Moral Trade",
    description,
    url: getAbsoluteUrl("/start"),
    type: "website",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Moral Trade action paths",
  url: getAbsoluteUrl("/start"),
  itemListElement: START_PATHS.map((path, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: path.title,
    url: getAbsoluteUrl(path.href),
    description: path.description,
  })),
};

const getStartViewer = cache(() => getViewer());

function StartHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <SiteTopbar
      brandHref="/"
      links={getPrimaryNavLinks(isAuthenticated)}
      authLink={getTopbarActions(isAuthenticated).authLink}
      showSearch={false}
      showLogout={isAuthenticated}
    />
  );
}

async function StartTopbar() {
  return <StartHeader isAuthenticated={Boolean(await getStartViewer())} />;
}

type StartPath = (typeof START_PATHS)[number];

function StartPathLink({ path, href = path.href }: { path: StartPath; href?: string }) {
  return (
    <Link
      aria-describedby={`start-${path.key}-description`}
      aria-labelledby={`start-${path.key}-title`}
      className={styles.path}
      data-start-path={path.key}
      href={href}
      prefetch={false}
    >
      <span className={styles.pathCopy}>
        <span className={styles.pathTitle} id={`start-${path.key}-title`}>{path.title}</span>
        <span className={styles.pathDescription} id={`start-${path.key}-description`}>
          {path.description}
        </span>
      </span>
      <span aria-hidden="true" className={styles.arrow}>→</span>
    </Link>
  );
}

async function StartCreateLink({ path }: { path: StartPath }) {
  const viewer = await getStartViewer();
  return <StartPathLink path={path} href={getStartCreateHref(Boolean(viewer))} />;
}

export default function StartPage() {
  return (
    <div className={`page-shell ${styles.shell}`}>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <header>
        <Suspense fallback={<StartHeader />}>
          <StartTopbar />
        </Suspense>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.intro}>
          <h1>Get started</h1>
          <p>Choose a first step. Review the details before you commit.</p>
        </div>

        <nav aria-label="Ways to get started" className={styles.paths}>
          {START_PATHS.map((path) => path.key === "create" ? (
            <Suspense
              fallback={<StartPathLink path={path} href={getStartCreateHref(false)} />}
              key={path.key}
            >
              <StartCreateLink path={path} />
            </Suspense>
          ) : (
            <StartPathLink key={path.key} path={path} />
          ))}
        </nav>

        <p className={styles.note}>Choosing a path does not make a payment or accept a trade.</p>

        <details className={styles.safeguards}>
          <summary>Before you commit</summary>
          <div className={styles.safeguardCopy}>
            <p><strong>Payments.</strong> Donations are completed on Every.org. Moral Trade does not hold funds, offer escrow, or decide tax treatment.</p>
            <p><strong>Your limits.</strong> Review the money, time, actions, deadlines, conditions, and cancellation rules before accepting.</p>
            <p><strong>Evidence.</strong> Submitted or imported evidence is not automatically reviewed or verified. Disputed and unavailable evidence remain separate states.</p>
            <Link href="/status" prefetch={false}>Review service boundaries</Link>
          </div>
        </details>
      </main>

      <footer className={styles.footer}>
        <span>© 2026 Moral Trade</span>
        <nav aria-label="Footer">
          <Link href="/privacy" prefetch={false}>Privacy</Link>
          <Link href="/terms" prefetch={false}>Terms</Link>
          <Link href="/accessibility" prefetch={false}>Accessibility</Link>
          <Link href="/contact" prefetch={false}>Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
