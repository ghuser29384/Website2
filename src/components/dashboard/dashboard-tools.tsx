"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getLegacyDashboardTarget, type DashboardView } from "@/lib/dashboard-view";
import styles from "./dashboard-tools.module.css";

export function DashboardTools({ active }: { active: DashboardView }) {
  useEffect(() => {
    if (active !== "priorities") return;
    function preserveLegacySection() {
      if (window.location.pathname !== "/dashboard") return;
      const target = getLegacyDashboardTarget(window.location.search, window.location.hash);
      if (target) window.location.replace(target);
    }
    preserveLegacySection();
    window.addEventListener("hashchange", preserveLegacySection);
    return () => window.removeEventListener("hashchange", preserveLegacySection);
  }, [active]);

  return (
    <nav className={styles.tools} aria-label="Dashboard controls">
      <Link href="/dashboard" prefetch={false} aria-current={active === "priorities" ? "page" : undefined}>
        100 Sparks
      </Link>
      <details className={styles.currency} onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary>Currency</summary>
        <div className={styles.currencyDetails}>
          <h2>Currency</h2>
          <p>Amounts use the currency stated in each offer or agreement. An account-wide currency selector is not available.</p>
          <p>Changing your sparks does not convert amounts or change any payment terms.</p>
          <Link href="/dashboard?view=controls#payment-setup" prefetch={false}>Payment setup</Link>
        </div>
      </details>
      <Link href="/complete-profile" prefetch={false}>Profile details</Link>
      <Link href="/dashboard?view=controls#privacy-controls" prefetch={false}>Privacy</Link>
      <Link href="/dashboard?view=controls#notifications" prefetch={false}>Notifications</Link>
      <Link href="/dashboard?view=controls" prefetch={false} aria-current={active === "controls" ? "page" : undefined}>
        More controls
      </Link>
    </nav>
  );
}
