"use client";

import { useState, type FormEvent } from "react";
import styles from "./profile-setup.module.css";

type Limits = { moneyBudgetCents: number; timeBudgetMinutes: number; actionBudgetCount: number | null; horizon: string };
const horizons = ["day", "week", "month", "quarter", "year"];

export function ResourceLimits() {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  async function load() {
    if (busy || limits) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/live-now", { cache: "no-store", signal: AbortSignal.timeout(12000) });
      const payload = await response.json();
      if (payload.authenticated === false || response.status === 401) { setSignedOut(true); return; }
      const planner = payload.routePlanner;
      const profile = planner?.profile;
      if (!response.ok || planner?.status === "unavailable" || !profile ||
          !Number.isInteger(profile.moneyBudgetCents) || !Number.isInteger(profile.timeBudgetMinutes) ||
          !horizons.includes(profile.horizon)) throw new Error("unavailable");
      setLimits({ moneyBudgetCents: profile.moneyBudgetCents, timeBudgetMinutes: profile.timeBudgetMinutes,
        actionBudgetCount: profile.actionBudgetCount ?? null, horizon: profile.horizon });
      setSignedOut(false);
    } catch { setMessage("We couldn’t load your limits. Please try again."); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!limits || busy) return;
    const data = new FormData(event.currentTarget);
    const updated = { moneyBudgetCents: Math.round(Number(data.get("money")) * 100),
      timeBudgetMinutes: Number(data.get("time")), horizon: String(data.get("horizon")),
      ...(String(data.get("actions")) !== "" ? { actionBudgetCount: Number(data.get("actions")) } : {}) };
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/live-now/route-profile", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_profile", profile: updated }), signal: AbortSignal.timeout(12000) });
      const payload = await response.json();
      if (response.status === 401) { setSignedOut(true); setLimits(null); throw new Error("signed_out"); }
      if (!response.ok || payload.saved !== true) throw new Error("save_failed");
      setLimits({ ...limits, ...updated });
      setMessage("Your resource limits are saved.");
    } catch { setMessage("Your changes weren’t saved. Please try again."); }
    finally { setBusy(false); }
  }

  return <details className={styles.personalization} onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary>Optional resource limits</summary>
    <p>Choose how much money and time you’re comfortable offering. Saving these preferences does not reserve money or create a commitment.</p>
    {signedOut ? <p><a href="/login?returnTo=%2Fcomplete-profile">Sign in to manage your limits</a></p> : limits ?
      <form onSubmit={save}>
        <div className={styles.fields}>
          <label>Time period<select name="horizon" defaultValue={limits.horizon}>{horizons.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
          <label>Money limit (USD)<input name="money" type="number" min="0" max="1000000" step="0.01" defaultValue={limits.moneyBudgetCents / 100} required /></label>
          <label>Time limit (minutes)<input name="time" type="number" min="0" max="100000" step="1" defaultValue={limits.timeBudgetMinutes} required /></label>
          <label>Action limit (optional)<input name="actions" type="number" min="0" max="1000" step="1" defaultValue={limits.actionBudgetCount ?? ""} /></label>
        </div>
        <button className={styles.primary} disabled={busy} type="submit">{busy ? "Saving…" : "Save limits"}</button>
      </form> : busy ? <p role="status">Loading your limits…</p> : <button type="button" onClick={() => void load()}>Try again</button>}
    {message ? <p role="status">{message}</p> : null}
  </details>;
}
