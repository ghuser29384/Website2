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
    <div className={`page-shell ${styles.shell}`}>
      <header className={styles.header}>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(viewerPresent)}
          {...getTopbarActions(viewerPresent)}
          showSearch={false}
          showLogout={viewerPresent}
        />
        <nav
          aria-label="Collective commitments"
          className={`${styles.subnav} ${mobileStyles.responsiveSubnav}`}
        >
          <Link href="/collective-commitments">Collective commitments</Link>
          <Link href="/collective-commitments/new">Create</Link>
          <Link href="/collective-commitments/identity">Identity verification</Link>
        </nav>
      </header>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
