"use client";

import { useEffect, useState } from "react";

interface GreetingState {
  date: string;
  timeOfDay: string;
  dateTime: string;
}

function makeGreeting(now: Date): GreetingState {
  const hour = now.getHours();
  return {
    date: new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(now),
    timeOfDay: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    dateTime: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
  };
}

export function CommitmentsLocalGreeting({ name, className }: { name: string; className?: string }) {
  const [greeting, setGreeting] = useState<GreetingState | null>(null);

  useEffect(() => {
    const refresh = () => setGreeting(makeGreeting(new Date()));
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <div className={className} aria-live="polite" aria-busy={!greeting}>
      {greeting ? (
        <>
          <time dateTime={greeting.dateTime}>{greeting.date}</time>
          <span>{`${greeting.timeOfDay}, ${name}.`}</span>
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
