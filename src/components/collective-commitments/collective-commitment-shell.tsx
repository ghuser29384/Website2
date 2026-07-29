import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./collective-commitments.module.css";
import mobileStyles from "./collective-commitments-mobile.module.css";

export function CollectiveCommitmentShell({
  children,
  viewerPresent,
}: {
  children: ReactNode;
  viewerPresent: boolean;
}) {
  return (
    <div className={`page-shell ${styles.shell} ${mobileStyles.responsiveShell}`}>
      <header className={styles.header}>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(viewerPresent)}
          {...getTopbarActions(viewerPresent)}
          showSearch={false}
          showLogout={viewerPresent}
        />
        <nav
          aria-label="Collective commitment record"
          className={`${styles.subnav} ${mobileStyles.responsiveSubnav}`}
        >
          <Link href="/trades/new">Create</Link>
          <Link href="/trades/new?mode=collective#collective-commitments-list">
            Collective commitments
          </Link>
          <Link href="/trades/new?mode=collective#collective-identity">
            Identity verification
          </Link>
        </nav>
      </header>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
