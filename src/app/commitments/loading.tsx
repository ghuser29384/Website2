import Link from "next/link";

import styles from "./loading.module.css";

// No viewer lookup or portfolio imports here: this boundary must be able to
// stream while the private page authenticates and loads its real records.
export default function CommitmentsLoading() {
  return (
    <div className={styles.shell}>
      <header className={styles.navigation}>
        <Link className={styles.brand} href="/" prefetch={false}>Moral Trade</Link>
        <Link className={styles.discover} href="/discover" prefetch={false}>Discover opportunities</Link>
      </header>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.intro}>
          <div>
            <h1>Commitments</h1>
            <p>Track your commitments, proof, outcomes, and impact.</p>
          </div>
          <p className={styles.status} role="status">Loading your commitments…</p>
        </div>
        <div aria-hidden="true">
          <div className={styles.tabs}>
            {[0, 1, 2, 3].map((item) => <span key={item} />)}
          </div>
          <div className={styles.summary}>
            {[0, 1, 2, 3, 4].map((item) => <div className={styles.metric} key={item} />)}
          </div>
          <div className={styles.projection} />
          <div className={styles.details} />
        </div>
      </main>
    </div>
  );
}
