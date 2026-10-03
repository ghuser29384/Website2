import "server-only";

import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import { accountPaymentMode, AccountPaymentError } from "./account-payment-policy";
import { createAccountPaymentService, type AccountPaymentRepository } from "./account-payment-service";

export async function accountPayments() {
  const livemode = accountPaymentMode(process.env);
  const stripe = getStripe();
  const db = createServiceClient();
  const [platform, balance] = await Promise.all([stripe.accounts.retrieve(null), stripe.balance.retrieve()]);
  if (balance.livemode !== livemode || (process.env.STRIPE_PLATFORM_ACCOUNT_ID && platform.id !== process.env.STRIPE_PLATFORM_ACCOUNT_ID.trim())) {
    throw new AccountPaymentError("The payment provider configuration needs review. Please contact support.");
  }
  const platformId = platform.id;
  const columns = "id,profile_id,platform_account_id,livemode,stripe_customer_id,customer_started_at,stripe_account_id,account_started_at,account_country" as const;
  const scoped = (id: string) => db.from("account_payment_settings").select(columns)
    .eq("profile_id", id).eq("platform_account_id", platformId).eq("livemode", livemode);
  const fail = (error: { code?: string } | null) => {
    if (error) {
      // Never log provider responses, account identifiers, or secret-bearing errors.
      console.error("[account-payments] payment settings storage unavailable", { code: error.code });
      throw new AccountPaymentError("Payment settings could not be loaded. Please try again or contact support.");
    }
  };
  const read: AccountPaymentRepository["read"] = async (id) => {
    const result = await scoped(id).maybeSingle(); fail(result.error); return result.data;
  };
  const repository: AccountPaymentRepository = {
    read,
    async reserve(id) {
      const result = await db.from("account_payment_settings").upsert({ profile_id: id, platform_account_id: platformId, livemode },
        { onConflict: "profile_id,platform_account_id,livemode", ignoreDuplicates: true });
      fail(result.error);
      const row = await read(id);
      if (!row) throw new AccountPaymentError("Payment settings could not be initialized.");
      return row;
    },
    async begin(id, kind, country) {
      const field = kind === "customer" ? "customer_started_at" : "account_started_at";
      const update = kind === "customer" ? { customer_started_at: new Date().toISOString() }
        : { account_started_at: new Date().toISOString(), account_country: country };
      const result = await db.from("account_payment_settings").update(update)
        .eq("profile_id", id).eq("platform_account_id", platformId).eq("livemode", livemode).is(field, null);
      fail(result.error);
      const row = await read(id);
      if (!row) throw new AccountPaymentError("Payment settings could not be initialized.");
      return row;
    },
    async save(id, kind, providerId) {
      const field = kind === "customer" ? "stripe_customer_id" : "stripe_account_id";
      const values = kind === "customer" ? { stripe_customer_id: providerId } : { stripe_account_id: providerId };
      const result = await db.from("account_payment_settings").update(values)
        .eq("profile_id", id).eq("platform_account_id", platformId).eq("livemode", livemode).is(field, null);
      fail(result.error);
      const saved = await read(id);
      if (!saved || saved[field] !== providerId) throw new AccountPaymentError("Payment setup needs reconciliation. Please contact support.");
    },
    async legacyPayout(id) {
      const result = await db.from("profile_payment_accounts").select("stripe_account_id").eq("profile_id", id).maybeSingle();
      fail(result.error); return result.data?.stripe_account_id ?? null;
    },
    async syncPayout(id, account) {
      // Keep existing agreement payout routing, but never overwrite a different mapping.
      const values = { profile_id: id, stripe_account_id: account.id,
        charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted };
      const inserted = await db.from("profile_payment_accounts").upsert(values, { onConflict: "profile_id", ignoreDuplicates: true });
      fail(inserted.error);
      const updated = await db.from("profile_payment_accounts").update({
        stripe_account_id: account.id, charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled, details_submitted: account.details_submitted,
      })
        .eq("profile_id", id).eq("stripe_account_id", account.id).select("stripe_account_id").maybeSingle();
      fail(updated.error);
      if (!updated.data) throw new AccountPaymentError("Your receiving account mapping needs review. Please contact support.");
    },
  };
  return {
    service: createAccountPaymentService({ stripe, repository, platformId, livemode, origin: getSiteUrl() }),
    livemode,
    async countries() {
      const result = await stripe.countrySpecs.list({ limit: 100 });
      return result.data.map((country) => country.id).sort();
    },
  };
}

export async function takeAccountPaymentSetupSlot(profileId: string) {
  const { data, error } = await createServiceClient().rpc("take_account_payment_setup_slot", { p_profile_id: profileId });
  if (error || data !== true) {
    throw new AccountPaymentError(error ? "Payment setup is temporarily unavailable. Please try again later."
      : "Too many setup attempts. Please wait a minute and try again.");
  }
}
