"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./reminder-launcher.module.css";

export function ReminderLauncher({ agreementId }: { agreementId: string }) {
  const pathname = usePathname();
  if (pathname.endsWith("/reminders")) return null;

  return (
    <Link
      aria-label="Manage commitment reminders"
      className={styles.launcher}
      href={`/trade-agreements/${agreementId}/reminders`}
    >
      <span>
        <strong>Manage reminders</strong>
        <small>Schedule · Timeline · Rules · Calendar</small>
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </Link>
  );
}
