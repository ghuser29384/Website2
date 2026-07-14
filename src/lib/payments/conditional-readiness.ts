import {
  getStripe,
  getStripePlatformAccountId,
  getStripeWebhookSecret,
  hasStripeEnv,
} from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { getConditionalPaymentsEnvironment } from "@/lib/payments/conditional-state";

export interface ConditionalPaymentGateState {
  key: string;
  status: "passed" | "pending" | "blocked";
  notes: string;
}

export interface ConditionalPaymentReadiness {
  mode: "disabled" | "test" | "live";
  livemode: boolean;
  enabledByEnvironment: boolean;
  webhookSecretConfigured: boolean;
  accountReachable: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  activeDestinationCount: number;
  signedWebhookSeen: boolean;
  gates: ConditionalPaymentGateState[];
  canCreateMandates: boolean;
  canSettle: boolean;
  blockers: string[];
  checkedAt: string;
}

export async function getConditionalPaymentReadiness(): Promise<ConditionalPaymentReadiness> {
  const environment = getConditionalPaymentsEnvironment();
  const webhookSecretConfigured = Boolean(getStripeWebhookSecret());
  const blockers: string[] = [];
  let accountReachable = false;
  let chargesEnabled = false;
  let payoutsEnabled = false;
  let detailsSubmitted = false;
  let activeDestinationCount = 0;
  let signedWebhookSeen = false;
  let gates: ConditionalPaymentGateState[] = [];

  if (!environment.enabled) {
    blockers.push(environment.reason);
  }

  if (!hasStripeEnv()) {
    blockers.push("STRIPE_SECRET_KEY is not configured.");
  }

  if (!webhookSecretConfigured) {
    blockers.push("STRIPE_WEBHOOK_SECRET is not configured; payment state cannot be trusted.");
  }

  try {
    const supabase = createServiceClient() as any;
    const [destinationResult, gatesResult, webhookResult] = await Promise.all([
      supabase
        .from("conditional_payment_destinations")
        .select("id", { count: "exact", head: true })
        .eq("livemode", environment.livemode)
        .eq("status", "active"),
      supabase
        .from("conditional_payment_gate_status")
        .select("gate_key, status, notes")
        .eq("environment", environment.livemode ? "live" : "test")
        .order("gate_key", { ascending: true }),
      supabase
        .from("conditional_payment_webhook_events")
        .select("stripe_event_id")
        .eq("livemode", environment.livemode)
        .eq("signature_verified", true)
        .eq("status", "processed")
        .limit(1),
    ]);

    if (destinationResult.error) {
      blockers.push(`Destination readiness could not be read: ${destinationResult.error.message}`);
    } else {
      activeDestinationCount = destinationResult.count ?? 0;
    }

    if (gatesResult.error) {
      blockers.push(`Payment gates could not be read: ${gatesResult.error.message}`);
    } else {
      gates = (gatesResult.data ?? []).map((row: any) => ({
        key: String(row.gate_key),
        status: row.status as ConditionalPaymentGateState["status"],
        notes: String(row.notes ?? ""),
      }));
    }

    if (!webhookResult.error) {
      signedWebhookSeen = Boolean(webhookResult.data?.length);
    }
  } catch (error) {
    blockers.push(
      `Conditional-payment database readiness failed: ${
        error instanceof Error ? error.message : "unknown database error"
      }`,
    );
  }

  if (environment.enabled && hasStripeEnv()) {
    try {
      const account = await getStripe().accounts.retrieve(getStripePlatformAccountId());
      accountReachable = true;
      chargesEnabled = account.charges_enabled === true;
      payoutsEnabled = account.payouts_enabled === true;
      detailsSubmitted = account.details_submitted === true;
    } catch (error) {
      blockers.push(
        `Stripe account readiness failed: ${
          error instanceof Error ? error.message : "unknown Stripe account error"
        }`,
      );
    }
  }

  if (activeDestinationCount < 1) {
    blockers.push(
      environment.livemode
        ? "No approved live recipient destination is mapped."
        : "No active Stripe test destination is mapped.",
    );
  }

  const blockingGate = gates.find((gate) => gate.status !== "passed");
  if (environment.livemode && blockingGate) {
    blockers.push(`Live gate ${blockingGate.key} is ${blockingGate.status}: ${blockingGate.notes}`);
  }

  const canCreateMandates =
    environment.enabled &&
    webhookSecretConfigured &&
    accountReachable &&
    activeDestinationCount > 0 &&
    (!environment.livemode || gates.every((gate) => gate.status === "passed"));

  const canSettle =
    canCreateMandates &&
    chargesEnabled &&
    (environment.livemode ? payoutsEnabled && detailsSubmitted : true);

  if (canCreateMandates && !chargesEnabled) {
    blockers.push("Stripe reports that platform charges are not enabled.");
  }

  if (environment.livemode && chargesEnabled && (!payoutsEnabled || !detailsSubmitted)) {
    blockers.push("Stripe live payouts or required platform details are not enabled.");
  }

  return {
    mode: environment.mode,
    livemode: environment.livemode,
    enabledByEnvironment: environment.enabled,
    webhookSecretConfigured,
    accountReachable,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    activeDestinationCount,
    signedWebhookSeen,
    gates,
    canCreateMandates,
    canSettle,
    blockers: [...new Set(blockers)],
    checkedAt: new Date().toISOString(),
  };
}
