import type Stripe from "stripe";
import {
  ACCOUNT_PAYMENT_PURPOSE, ACCOUNT_PAYMENTS_PATH, AccountPaymentError,
  MAX_SAVED_PAYMENT_METHODS, PAYMENT_METHOD_CONSENT_VERSION, assertUuid,
  maskPaymentMethod, paymentReturnOrigin, payoutStatus, safeStripeDestination, stripeObjectId,
} from "./account-payment-policy";

export interface PaymentActor { id: string; email?: string; name?: string }
export interface AccountPaymentRecord {
  id: string;
  profile_id: string;
  platform_account_id: string;
  livemode: boolean;
  stripe_customer_id: string | null;
  customer_started_at: string | null;
  stripe_account_id: string | null;
  account_started_at: string | null;
  account_country: string | null;
}
export interface AccountPaymentRepository {
  read: (profileId: string) => Promise<AccountPaymentRecord | null>;
  reserve: (profileId: string) => Promise<AccountPaymentRecord>;
  begin: (profileId: string, kind: "customer" | "account", country?: string) => Promise<AccountPaymentRecord>;
  save: (profileId: string, kind: "customer" | "account", id: string) => Promise<void>;
  legacyPayout: (profileId: string) => Promise<string | null>;
  syncPayout: (profileId: string, account: Stripe.Account) => Promise<void>;
}
export interface AccountPaymentServiceInput {
  stripe: Stripe;
  repository: AccountPaymentRepository;
  platformId: string;
  livemode: boolean;
  origin: string;
  now?: () => number;
}

/** No capture, transfer, subscription, or agreement-authorizing operations belong here. */
export function createAccountPaymentService(input: AccountPaymentServiceInput) {
  const { stripe, repository: repo, platformId, livemode } = input;
  const now = input.now ?? Date.now;
  const origin = paymentReturnOrigin(input.origin, livemode);
  const returnUrl = `${origin}${ACCOUNT_PAYMENTS_PATH}`;

  function owner(actor: PaymentActor) { assertUuid(actor.id); }
  function checkRecord(record: AccountPaymentRecord, actor: PaymentActor) {
    if (record.profile_id !== actor.id || record.platform_account_id !== platformId || record.livemode !== livemode) {
      throw new AccountPaymentError("This payment profile could not be verified. Please contact support.");
    }
  }
  function metadata(actor: PaymentActor) {
    return { purpose: ACCOUNT_PAYMENT_PURPOSE, profile_id: actor.id, platform_account_id: platformId };
  }
  function hasOwnerMetadata(value: Stripe.Metadata | null, actor: PaymentActor) {
    return value?.purpose === ACCOUNT_PAYMENT_PURPOSE && value.profile_id === actor.id && value.platform_account_id === platformId;
  }
  async function verifiedCustomer(actor: PaymentActor, id: string) {
    const customer = await stripe.customers.retrieve(id);
    if (customer.deleted || customer.livemode !== livemode || !hasOwnerMetadata(customer.metadata, actor)) {
      throw new AccountPaymentError("This saved payment profile could not be verified. Please contact support.");
    }
    return customer;
  }
  async function customerId(actor: PaymentActor, create = false): Promise<string | null> {
    owner(actor);
    let row = await repo.read(actor.id);
    if (!row && !create) return null;
    row ??= await repo.reserve(actor.id);
    checkRecord(row, actor);
    if (row.stripe_customer_id) {
      await verifiedCustomer(actor, row.stripe_customer_id);
      return row.stripe_customer_id;
    }
    if (!create) return null;
    row = await repo.begin(actor.id, "customer");
    checkRecord(row, actor);
    if (row.stripe_customer_id) {
      await verifiedCustomer(actor, row.stripe_customer_id);
      return row.stripe_customer_id;
    }
    // Never replay a possibly successful creation after Stripe's idempotency window.
    assertCreationWindow(row.customer_started_at);
    const customer = await stripe.customers.create({
      email: actor.email, name: actor.name, metadata: metadata(actor),
    }, { idempotencyKey: `mt-account-customer:${row.id}` });
    if (customer.livemode !== livemode || !hasOwnerMetadata(customer.metadata, actor)) {
      throw new AccountPaymentError("Stripe returned an unexpected payment profile.");
    }
    await repo.save(actor.id, "customer", customer.id);
    return customer.id;
  }
  function assertCreationWindow(start: string | null) {
    const time = start ? Date.parse(start) : NaN;
    if (!Number.isFinite(time) || time > now() + 60_000 || now() - time > 23 * 60 * 60 * 1000) {
      throw new AccountPaymentError("An earlier setup attempt needs to be reconciled. Please contact support; do not create another account.");
    }
  }
  async function methods(actor: PaymentActor) {
    const id = await customerId(actor);
    if (!id) return { methods: [], atLimit: false };
    const result = await stripe.paymentMethods.list({ customer: id, limit: MAX_SAVED_PAYMENT_METHODS });
    for (const method of result.data) {
      if (stripeObjectId(method.customer) !== id || method.livemode !== livemode) {
        throw new AccountPaymentError("Saved payment methods could not be verified.");
      }
    }
    return { methods: result.data.map(maskPaymentMethod), atLimit: result.has_more || result.data.length >= MAX_SAVED_PAYMENT_METHODS };
  }
  async function addMethod(actor: PaymentActor, consent: boolean, requestId: string) {
    owner(actor); assertUuid(requestId);
    if (!consent) throw new AccountPaymentError("Please agree to save your payment method before continuing.");
    if ((await methods(actor)).atLimit) throw new AccountPaymentError("Remove an unused payment method before adding another.");
    const id = (await customerId(actor, true))!;
    const savedMetadata = { ...metadata(actor), consent_version: PAYMENT_METHOD_CONSENT_VERSION, consent_request_id: requestId };
    const session = await stripe.checkout.sessions.create({
      mode: "setup", customer: id, currency: "usd", client_reference_id: actor.id,
      payment_method_data: { allow_redisplay: "always" },
      metadata: savedMetadata,
      setup_intent_data: { metadata: savedMetadata, description: "Save a payment method only. No charge or trade authorization." },
      custom_text: { submit: { message: "Save for future Moral Trade checkouts you approve. No payment is charged now. Each trade needs separate authorization." } },
      success_url: `${returnUrl}?setup_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?flow=cancelled`,
    }, { idempotencyKey: `mt-account-method:${actor.id}:${requestId}` });
    if (session.mode !== "setup" || session.livemode !== livemode || stripeObjectId(session.customer) !== id || session.payment_intent) {
      throw new AccountPaymentError("Stripe returned an unexpected setup session.");
    }
    return safeStripeDestination(session.url);
  }
  async function setupResult(actor: PaymentActor, sessionId: string): Promise<"saved" | "pending"> {
    owner(actor);
    if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId) || sessionId.length > 255) throw new AccountPaymentError("Invalid setup return. Please review your saved methods below.");
    const id = await customerId(actor);
    if (!id) throw new AccountPaymentError("No payment profile was found for this setup.");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== "setup" || session.livemode !== livemode || session.payment_intent ||
        session.client_reference_id !== actor.id || stripeObjectId(session.customer) !== id ||
        !hasOwnerMetadata(session.metadata, actor) || session.metadata?.consent_version !== PAYMENT_METHOD_CONSENT_VERSION) {
      throw new AccountPaymentError("This setup does not belong to your payment profile.");
    }
    const setupId = stripeObjectId(session.setup_intent);
    if (session.status !== "complete" || !setupId) return "pending";
    const setup = await stripe.setupIntents.retrieve(setupId);
    if (setup.livemode !== livemode || stripeObjectId(setup.customer) !== id || !hasOwnerMetadata(setup.metadata, actor) ||
        setup.metadata?.consent_version !== PAYMENT_METHOD_CONSENT_VERSION ||
        setup.metadata?.consent_request_id !== session.metadata?.consent_request_id) {
      throw new AccountPaymentError("Stripe setup confirmation could not be verified.");
    }
    if (setup.status !== "succeeded") return "pending";
    const methodId = stripeObjectId(setup.payment_method);
    if (!methodId) return "pending";
    const method = await stripe.paymentMethods.retrieve(methodId);
    if (method.livemode !== livemode || stripeObjectId(method.customer) !== id) {
      throw new AccountPaymentError("The saved method is no longer attached to your profile.");
    }
    return "saved";
  }
  async function removeMethod(actor: PaymentActor, methodId: string, confirmed: boolean) {
    owner(actor);
    if (!confirmed) throw new AccountPaymentError("Confirm removal before continuing.");
    if (!/^pm_[A-Za-z0-9]+$/.test(methodId) || methodId.length > 255) throw new AccountPaymentError("Invalid payment method.");
    const id = await customerId(actor);
    if (!id) throw new AccountPaymentError("No saved payment profile was found.");
    const method = await stripe.paymentMethods.retrieve(methodId);
    if (method.livemode !== livemode || stripeObjectId(method.customer) !== id) throw new AccountPaymentError("This method does not belong to your payment profile.");
    // Dedicated account-level customers are never used by existing conditional mandates.
    await stripe.paymentMethods.detach(methodId);
  }
  async function verifiedPayout(actor: PaymentActor, id: string) {
    const account = await stripe.accounts.retrieve(id);
    if (account.id === platformId || account.metadata?.profile_id !== actor.id) {
      throw new AccountPaymentError("This payout account could not be verified. Please contact support.");
    }
    const balance = await stripe.balance.retrieve({}, { stripeAccount: id });
    if (balance.livemode !== livemode) throw new AccountPaymentError("Payout account environment does not match.");
    return account;
  }
  async function payout(actor: PaymentActor) {
    owner(actor);
    const record = await repo.read(actor.id);
    if (record) checkRecord(record, actor);
    // Do not import unscoped legacy live accounts into a sandbox.
    const id = record?.stripe_account_id ?? (livemode ? await repo.legacyPayout(actor.id) : null);
    if (!id) return null;
    return verifiedPayout(actor, id);
  }
  async function receiveOverview(actor: PaymentActor) {
    const account = await payout(actor);
    if (!account) return null;
    const external = await stripe.accounts.listExternalAccounts(account.id, { limit: 20 });
    return {
      status: payoutStatus(account), country: account.country ?? "",
      canManage: account.controller?.stripe_dashboard?.type === "express" || account.type === "express",
      methods: external.data.flatMap((method) => {
        if (method.object === "bank_account") return [{ label: `${method.bank_name || "Bank account"} ending in ${method.last4}`, currency: method.currency.toUpperCase() }];
        if (method.object === "card") return [{ label: `${method.brand} ending in ${method.last4}`, currency: method.currency?.toUpperCase() ?? "" }];
        return [];
      }),
      hasMore: external.has_more,
    };
  }
  async function beginReceiving(actor: PaymentActor, selectedCountry: string) {
    owner(actor);
    let account = await payout(actor);
    if (!account) {
      const country = selectedCountry.toUpperCase();
      if (!/^[A-Z]{2}$/.test(country)) throw new AccountPaymentError("Choose your country before continuing.");
      await stripe.countrySpecs.retrieve(country); // Stripe, not a handwritten list, validates the country.
      await repo.reserve(actor.id);
      const row = await repo.begin(actor.id, "account", country);
      checkRecord(row, actor);
      if (row.account_country !== country) throw new AccountPaymentError("Resume setup with the country originally selected, or contact support to change it.");
      if (row.stripe_account_id) account = await verifiedPayout(actor, row.stripe_account_id);
      else {
        assertCreationWindow(row.account_started_at);
        account = await stripe.accounts.create({
          country, email: actor.email,
          // Preserve the existing platform's responsibilities and capability model.
          controller: { fees: { payer: "application" }, losses: { payments: "application" }, stripe_dashboard: { type: "express" }, requirement_collection: "stripe" },
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          metadata: { profile_id: actor.id, platform_account_id: platformId },
        }, { idempotencyKey: `mt-account-receive:${row.id}` });
        if (account.metadata?.profile_id !== actor.id) throw new AccountPaymentError("Stripe returned an unexpected receiving account.");
        await repo.save(actor.id, "account", account.id);
      }
    }
    if (livemode) await repo.syncPayout(actor.id, account);
    const link = await stripe.accountLinks.create({
      account: account.id, type: "account_onboarding",
      refresh_url: `${returnUrl}?flow=receive-refresh`, return_url: `${returnUrl}?flow=receive-return`,
    });
    return safeStripeDestination(link.url);
  }
  async function manageReceiving(actor: PaymentActor) {
    const account = await payout(actor);
    if (!account) throw new AccountPaymentError("Set up receiving payments first.");
    if (account.controller?.stripe_dashboard?.type !== "express" && account.type !== "express") {
      throw new AccountPaymentError("Manage this account directly in your Stripe dashboard.");
    }
    const link = await stripe.accounts.createLoginLink(account.id);
    return safeStripeDestination(link.url);
  }
  return { methods, addMethod, removeMethod, setupResult, receiveOverview, beginReceiving, manageReceiving, customerId };
}
