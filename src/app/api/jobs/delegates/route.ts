import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PersonalDelegateRow = Database["public"]["Tables"]["personal_delegates"]["Row"];
type HelperStrategyRow = Database["public"]["Tables"]["helper_strategies"]["Row"];

function isDue(delegate: PersonalDelegateRow, now: Date) {
  if (delegate.status !== "active" || delegate.operating_mode === "paused") {
    return false;
  }

  if (!delegate.last_run_at) {
    return true;
  }

  const lastRunAt = new Date(delegate.last_run_at);
  const elapsedMs = now.getTime() - lastRunAt.getTime();

  return elapsedMs >= 24 * 60 * 60 * 1000;
}

async function processDelegates(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const { data: delegates, error: delegateError } = await supabase
    .from("personal_delegates")
    .select("*")
    .eq("status", "active")
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(100);

  if (delegateError) {
    return NextResponse.json({ error: delegateError.message }, { status: 500 });
  }

  const dueDelegates = ((delegates ?? []) as PersonalDelegateRow[]).filter((delegate) =>
    isDue(delegate, now),
  );
  let delegatesProcessed = 0;
  let helperRunsCreated = 0;
  let riskSignalsCreated = 0;

  for (const delegate of dueDelegates) {
    const { data: strategies } = await supabase
      .from("helper_strategies")
      .select("*")
      .eq("profile_id", delegate.profile_id)
      .eq("status", "active")
      .order("priority", { ascending: true })
      .limit(10);
    const { data: synthesis } = await supabase
      .from("profile_syntheses")
      .select("*")
      .eq("profile_id", delegate.profile_id)
      .maybeSingle();
    const strategyRows = (strategies ?? []) as HelperStrategyRow[];

    if (!strategyRows.length) {
      const { error: signalError } = await supabase.from("risk_signals").insert({
        profile_id: delegate.profile_id,
        signal_type: "no_helper_strategy",
        severity: "low",
        summary:
          "The delegate is active, but no active helper strategy exists. Add at least one strategy before expecting background search coverage.",
      });

      if (!signalError) {
        riskSignalsCreated += 1;
      }
    }

    if (!synthesis || synthesis.confidence_score < 60) {
      const { error: signalError } = await supabase.from("risk_signals").insert({
        profile_id: delegate.profile_id,
        signal_type: "low_synthesis_confidence",
        severity: "low",
        summary:
          "The delegate scan found a low-confidence or missing deterministic synthesis. Refresh synthesis and answer clarification questions before relying on suggestions.",
      });

      if (!signalError) {
        riskSignalsCreated += 1;
      }
    }

    for (const strategy of strategyRows) {
      const { error } = await supabase.from("helper_runs").insert({
        strategy_id: strategy.id,
        profile_id: delegate.profile_id,
        status: "completed",
        candidates_scanned: 0,
        suggestions_created: 0,
        notes:
          "Non-AI delegate heartbeat completed. Use saved-search scans for candidate generation; this run records strategy coverage and readiness.",
        completed_at: now.toISOString(),
      });

      if (!error) {
        helperRunsCreated += 1;
      }

      await supabase
        .from("helper_strategies")
        .update({ last_run_at: now.toISOString() })
        .eq("id", strategy.id);
    }

    await supabase
      .from("personal_delegates")
      .update({ last_run_at: now.toISOString() })
      .eq("profile_id", delegate.profile_id);
    delegatesProcessed += 1;
  }

  return NextResponse.json({
    delegatesProcessed,
    helperRunsCreated,
    riskSignalsCreated,
  });
}

export async function GET(request: Request) {
  return processDelegates(request);
}

export async function POST(request: Request) {
  return processDelegates(request);
}
