import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks } from "@/lib/site";

import styles from "./start.module.css";

const description =
  "Choose whether to review Moral Trade's main features or continue directly to sign in.";

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

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

export default async function StartPage() {
  const viewer = await getViewer();
  if (viewer) redirect("/feed");

  return (
    <div className={`page-shell ${styles.shell}`}>
      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(false)}
          showLogout={false}
          showSearch={false}
        />
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <section aria-labelledby="start-heading" className={styles.content}>
          <div className={styles.intro}>
            <h1 id="start-heading">Is this your first time here?</h1>
            <p>Choose whether to review the main features or continue to sign in.</p>
          </div>

          <nav aria-label="Choose how to continue" className={styles.choices}>
            <Link
              aria-describedby="start-review-description"
              className={`${styles.choice} ${styles.reviewChoice}`}
              href="/walkthrough"
              prefetch={false}
            >
              <span className={styles.choiceTitle}>Yes — or I want a review</span>
              <span className={styles.choiceDescription} id="start-review-description">
                See the main features in the interactive walkthrough.
              </span>
              <span className={styles.choiceAction}>
                Open the walkthrough
                <ArrowIcon />
              </span>
            </Link>

            <Link
              aria-describedby="start-login-description"
              className={styles.choice}
              href="/login"
              prefetch={false}
            >
              <span className={styles.choiceTitle}>No — I know the main features</span>
              <span className={styles.choiceDescription} id="start-login-description">
                Continue to your account sign-in.
              </span>
              <span className={styles.choiceAction}>
                Go to sign in
                <ArrowIcon />
              </span>
            </Link>
          </nav>
        </section>
      </main>
    </div>
  );
}
