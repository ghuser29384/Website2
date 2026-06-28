import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";
import {
  evaluateBackgroundPolicyDecision,
  serializeBackgroundPolicyDecisionForResponse,
  type BackgroundActorRole,
  type BackgroundPhaseLaneKey,
  type BackgroundPolicyActionKind,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
  type MoralTradeApiRateLimitSurface,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const BACKGROUND_CONTROL_ROUTE_RESPONSE_SCHEMA_VERSION =
  "background-control-route-response-v1";

export interface BackgroundControlRouteConfig {
  actionKind?: BackgroundPolicyActionKind;
  actorRole?: BackgroundActorRole;
  laneKey?: BackgroundPhaseLaneKey;
  method: "GET" | "POST";
  operatorOnly?: boolean;
  purposeCode?: string;
  rateLimitSurface?: MoralTradeApiRateLimitSurface;
  state:
    | "disabled_stub"
    | "existing_surface_elsewhere"
    | "not_configured"
    | "read_only_status";
  surface: string;
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

function buildIdempotencyKey({
  method,
  surface,
  userId,
}: {
  method: string;
  surface: string;
  userId: string;
}) {
  return `${userId}:bg76-control:${method}:${surface}:${new Date()
    .toISOString()
    .slice(0, 10)}`;
}

function statusForState(state: BackgroundControlRouteConfig["state"]) {
  return state === "read_only_status" ? 200 : state === "existing_surface_elsewhere" ? 409 : 501;
}

function messageForState({
  method,
  state,
}: Pick<BackgroundControlRouteConfig, "method" | "state">) {
  if (state === "existing_surface_elsewhere") {
    return "This background-networking control is available through the existing governed product surface, not this compatibility endpoint.";
  }

  if (state === "read_only_status") {
    return "This background-networking status endpoint returns only generic participant-owned state.";
  }

  if (state === "disabled_stub") {
    return `${method} is registered as a fail-closed background-networking control surface and does not perform side effects in the current phase.`;
  }

  return `${method} is not configured for background-networking side effects in the current deployment.`;
}

export function buildBackgroundControlRouteHandler(config: BackgroundControlRouteConfig) {
  return async function handler(request: Request) {
    const rateLimit = takeMoralTradeApiRateLimitSlot(
      request,
      config.rateLimitSurface ?? "review_workflow_evaluate",
    );

    if (rateLimit.limited) {
      return buildMoralTradeApiRateLimitResponse(
        rateLimit,
        "Rate-limited background control requests fail closed without reading target-specific state.",
        "private, no-store",
      );
    }

    if (!hasSupabaseEnv()) {
      return privateJson({ error: "Supabase is not configured." }, 503);
    }

    if (config.method === "POST") {
      try {
        await request.json();
      } catch {
        return privateJson({ error: "Invalid JSON body." }, 400);
      }
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return privateJson({ error: "Authentication required." }, 401);
    }

    if (config.operatorOnly && !isAdminEmail(user.email)) {
      return privateJson(
        {
          error: "Operator authorization required.",
          schemaVersion: BACKGROUND_CONTROL_ROUTE_RESPONSE_SCHEMA_VERSION,
          state: "unavailable",
        },
        403,
      );
    }

    const policyDecision =
      config.actionKind && config.laneKey
        ? evaluateBackgroundPolicyDecision({
            actionKind: config.actionKind,
            actorRole: config.actorRole ?? (config.operatorOnly ? "admin" : "participant"),
            idempotencyKey: buildIdempotencyKey({
              method: config.method,
              surface: config.surface,
              userId: user.id,
            }),
            laneKey: config.laneKey,
            purposeCode: config.purposeCode ?? "moral_trade_offer",
            purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
          })
        : null;

    return privateJson(
      {
        controlSurface: config.surface,
        exactDetailsReturned: false,
        message: messageForState(config),
        policyDecision: policyDecision
          ? serializeBackgroundPolicyDecisionForResponse(policyDecision)
          : null,
        privateDetailsReturned: false,
        schemaVersion: BACKGROUND_CONTROL_ROUTE_RESPONSE_SCHEMA_VERSION,
        sideEffectsPerformed: false,
        state: config.state,
      },
      statusForState(config.state),
    );
  };
}
