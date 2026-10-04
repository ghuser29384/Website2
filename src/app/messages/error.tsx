"use client";

import { SiteLink } from "@/components/layout/site-link";

import styles from "@/components/messages/messages-inbox.module.css";

export default function MessagesError({ reset }: { reset: () => void }) {
  return (
    <div className={`page-shell ${styles.page}`}>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <header className={styles.heading}><h1>Messages</h1></header>
        <section className={styles.empty} aria-labelledby="messages-error-heading">
          <h2 id="messages-error-heading">We couldn’t load your messages</h2>
          <p>Please try again in a moment.</p>
          <button className={styles.primaryLink} type="button" onClick={reset}>Try again</button>
          <SiteLink className={styles.textLink} href="/">Back to home</SiteLink>
        </section>
      </main>
    </div>
  );
}
