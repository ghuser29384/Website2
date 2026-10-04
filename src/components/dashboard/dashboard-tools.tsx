"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getLegacyDashboardTarget, type DashboardView } from "@/lib/dashboard-view";
import styles from "./dashboard-tools.module.css";

export function DashboardTools({ active }: { active: DashboardView | "payments" }) {
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
    <nav className={styles.tools} aria-label="Profile controls">
      <Link href="/dashboard" prefetch={false} aria-current={active === "priorities" ? "page" : undefined}>
        Priorities
      </Link>
      <Link href="/dashboard/payments" prefetch={false} aria-current={active === "payments" ? "page" : undefined}>
        Payment setup
      </Link>
      <Link href="/complete-profile" prefetch={false}>Profile details</Link>
      <a href="/dashboard?view=controls#privacy-controls">Privacy</a>
      <a href="/dashboard?view=controls#notifications">Notifications</a>
      <Link href="/dashboard?view=controls" prefetch={false} aria-current={active === "controls" ? "page" : undefined}>
        More controls
      </Link>
    </nav>
  );
}
