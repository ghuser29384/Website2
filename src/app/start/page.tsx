import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";

import { SiteTopbar } from "@/components/layout/site-topbar";
import { QuickWalkthrough } from "@/components/walkthrough/quick-walkthrough";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getStartCreateHref } from "@/lib/start-paths";

import styles from "./start.module.css";

const description = "See how a moral trade can work, compare example terms, then create a proposal or browse trades.";
export const metadata: Metadata = {
  title: "Get started",
  description,
  alternates: { canonical: "/start" },
  openGraph: { title: "Get started | Moral Trade", description, url: getAbsoluteUrl("/start"), type: "website" },
};

const getStartViewer = cache(() => getViewer());

function StartHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return <SiteTopbar brandHref="/" links={getPrimaryNavLinks(isAuthenticated)} authLink={getTopbarActions(isAuthenticated).authLink} showSearch={false} showLogout={isAuthenticated} />;
}
async function StartTopbar() {
  return <StartHeader isAuthenticated={Boolean(await getStartViewer())} />;
}
function CreateAction({ href }: { href: string }) {
  return <Link className="mt-start-primary" href={href} prefetch={false}>Create a trade <span aria-hidden="true">→</span></Link>;
}
async function StartCreateAction() {
  const viewer = await getStartViewer();
  return <CreateAction href={getStartCreateHref(Boolean(viewer))} />;
}

export default function StartPage() {
  return (
    <div className={`page-shell ${styles.shell}`}>
      <header><Suspense fallback={<StartHeader />}><StartTopbar /></Suspense></header>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        <QuickWalkthrough createAction={<Suspense fallback={<CreateAction href={getStartCreateHref(false)} />}><StartCreateAction /></Suspense>} />
        <noscript>
          <style>{".mt-start-demo button{display:none!important}.mt-start-progress{display:none!important}"}</style>
          <section className={styles.noScript} aria-label="Continue without the interactive example">
            <p>The example is read-only without JavaScript. You can continue directly.</p>
            <Link href={getStartCreateHref(false)} prefetch={false}>Create a trade</Link>{" · "}<Link href="/discover" prefetch={false}>Browse trades</Link>
          </section>
        </noscript>
        <details className={styles.safeguards}>
          <summary>Before you commit</summary>
          <div className={styles.safeguardCopy}>
            <p><strong>Payments.</strong> Donations are completed on Every.org. Moral Trade does not hold funds, offer escrow, or decide tax treatment.</p>
            <p><strong>Your limits.</strong> Review the money, time, actions, deadlines, conditions, and cancellation rules before accepting. Either person can decline; a worse alternative must not be invented to pressure them.</p>
            <p><strong>Evidence.</strong> Submitted or imported evidence is not automatically reviewed or verified. Disputed and unavailable evidence remain separate states.</p>
            <Link href="/status" prefetch={false}>Review service boundaries</Link>
          </div>
        </details>
      </main>
      <footer className={styles.footer}><span>© 2026 Moral Trade</span><nav aria-label="Footer"><Link href="/privacy" prefetch={false}>Privacy</Link><Link href="/terms" prefetch={false}>Terms</Link><Link href="/accessibility" prefetch={false}>Accessibility</Link><Link href="/contact" prefetch={false}>Contact</Link></nav></footer>
    </div>
  );
}
