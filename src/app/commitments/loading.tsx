import Link from "next/link";

import styles from "./loading.module.css";

// No viewer lookup or portfolio imports here: this boundary must be able to
// stream while the private page authenticates and loads its real records.
export default function CommitmentsLoading() {
  return (
    <div className={styles.shell}>
      <header className={styles.navigation}>
        <Link className={styles.brand} href="/" prefetch={false}>Moral Trade</Link>
        <Link href="/discover" prefetch={false}>Discover opportunities</Link>
      </header>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        <h1>Commitments</h1>
        <p className={styles.status} role="status">Loading your commitments…</p>
        <div aria-hidden="true">
          <div className={styles.summary}>
            {[0, 1, 2, 3].map((item) => <div className={styles.metric} key={item} />)}
          </div>
          <div className={styles.content}>
            <div className={styles.records}>
              {[0, 1, 2].map((item) => <div className={styles.row} key={item} />)}
            </div>
            <div className={styles.activity} />
          </div>
        </div>
      </main>
    </div>
  );
}
