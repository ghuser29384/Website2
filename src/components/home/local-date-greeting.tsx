"use client";

import { useEffect, useState } from "react";

import styles from "./returning-home.module.css";

interface LocalDateGreetingProps {
  name: string;
}

interface LocalGreeting {
  dateLabel: string;
  dateTime: string;
  timeOfDay: "Good morning" | "Good afternoon" | "Good evening";
}

function getTimeOfDayGreeting(hour: number): LocalGreeting["timeOfDay"] {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getLocalDateTimeAttribute(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalGreeting(now: Date): LocalGreeting {
  return {
    dateLabel: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(now),
    dateTime: getLocalDateTimeAttribute(now),
    timeOfDay: getTimeOfDayGreeting(now.getHours()),
  };
}

export function LocalDateGreeting({ name }: LocalDateGreetingProps) {
  const [localGreeting, setLocalGreeting] = useState<LocalGreeting | null>(null);

  useEffect(() => {
    const refresh = () => {
      const next = getLocalGreeting(new Date());
      setLocalGreeting((current) =>
        current?.dateTime === next.dateTime && current.timeOfDay === next.timeOfDay
          ? current
          : next,
      );
    };

    const animationFrameId = window.requestAnimationFrame(refresh);
    const intervalId = window.setInterval(refresh, 60_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return (
    <div
      aria-atomic="true"
      aria-busy={localGreeting === null}
      aria-live="polite"
      className={styles.greeting}
      data-ready={localGreeting === null ? "false" : "true"}
      data-testid="local-date-greeting"
    >
      {localGreeting ? (
        <>
          <time dateTime={localGreeting.dateTime}>{localGreeting.dateLabel}</time>
          <span>
            {localGreeting.timeOfDay}, {name}.
          </span>
        </>
      ) : (
        <>
          <time aria-hidden="true">&nbsp;</time>
          <span aria-hidden="true">&nbsp;</span>
        </>
      )}
    </div>
  );
}
