import { SiteLink } from "@/components/layout/site-link";

import styles from "@/components/messages/messages-inbox.module.css";

export default function MessagesLoading() {
  return (
    <div className={`page-shell ${styles.page}`}>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <header className={styles.heading}><h1>Messages</h1></header>
        <section className={styles.empty} aria-busy="true" aria-label="Loading messages">
          <h2 role="status">Loading your messages…</h2>
          <p>This may take a moment.</p>
          <SiteLink className={styles.textLink} href="/">Back to home</SiteLink>
        </section>
      </main>
    </div>
  );
}
