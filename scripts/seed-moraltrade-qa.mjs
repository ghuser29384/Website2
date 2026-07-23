import { createClient } from "@supabase/supabase-js";

const REQUIRED_QA_REF = "hvmxfjjbdcgjjudmthdz";
const QA_OWNER_EMAIL = "qa-market-owner@example.com";
const QA_RESPONDER_EMAIL = "qa-market-responder@example.com";
const QA_OFFER_ID = "10000000-0000-4000-8000-000000000158";

function required(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assertQaProject(url) {
  const hostname = new URL(url).hostname;
  if (hostname !== `${REQUIRED_QA_REF}.supabase.co`) {
    throw new Error(
      `Refusing to seed ${hostname}. Expected the isolated MoralTrade QA project ${REQUIRED_QA_REF}.supabase.co.`,
    );
  }
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const user = data.users.find(
      (candidate) => candidate.email?.toLocaleLowerCase("en-US") === email,
    );
    if (user) return user;
    if (data.users.length < 100) break;
  }
  return null;
}

async function ensureUser(supabase, { email, displayName, password }) {
  const normalizedEmail = email.toLocaleLowerCase("en-US");
  let user = await findUserByEmail(supabase, normalizedEmail);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, qa_fixture: true },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        display_name: displayName,
        qa_fixture: true,
      },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: normalizedEmail,
      display_name: displayName,
      bio: "Synthetic participant used only for isolated MoralTrade QA.",
      affiliation: "MoralTrade QA",
      country: "US",
      public_location_granularity: "hidden",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  return user;
}

async function main() {
  const url = required("QA_SUPABASE_URL");
  const serviceRoleKey = required("QA_SUPABASE_SERVICE_ROLE_KEY");
  const password = required("QA_TEST_PASSWORD");
  assertQaProject(url);

  if (password.length < 14) {
    throw new Error("QA_TEST_PASSWORD must contain at least 14 characters.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const owner = await ensureUser(supabase, {
    email: QA_OWNER_EMAIL,
    displayName: "QA Offer Owner",
    password,
  });
  const responder = await ensureUser(supabase, {
    email: QA_RESPONDER_EMAIL,
    displayName: "QA Counterparty",
    password,
  });

  const now = new Date().toISOString();
  const { error: offerError } = await supabase.from("offers").upsert(
    {
      id: QA_OFFER_ID,
      owner_id: owner.id,
      owner_alias: "QA Offer Owner",
      mode: "pledge",
      offered_cause: "Global health",
      requested_cause: "Animal welfare",
      offer_action:
        "Review a two-page public report and provide a five-bullet, public-safe summary.",
      request_action:
        "Complete one documented animal-welfare action from an agreed bounded list.",
      compromise_cause: "Mutually agreed evidence quality",
      offer_impact: 2,
      min_counterparty_impact: 2,
      verification:
        "Timestamped public-safe summary plus a receipt or participant attestation for the reciprocal action.",
      duration: "14 days after both parties confirm the final terms",
      trust_level: 1,
      notes:
        "Synthetic QA fixture. No payment, donation, sensitive evidence, or real-world beneficiary is involved.",
      discount_note:
        "Bounded to one short report summary and one reversible animal-welfare action.",
      status: "open",
      workflow_status: "published",
      moderation_reason: "",
      submission_key: "qa-pr-158-marketplace-fixture",
      fingerprint: "qa-pr-158-marketplace-fixture-v1",
      no_trade_baseline:
        "Without a match, neither QA participant performs a new action and the fixture remains an unaccepted proposal.",
      exit_conditions:
        "Either participant may decline before acceptance. After acceptance, future obligations may be cancelled through the recorded agreement flow.",
      maximum_burden:
        "At most one five-bullet summary and one reversible, non-financial action; no payment or sensitive evidence.",
      privacy_scope:
        "Public-safe proposal terms; messages, account data, and any test evidence remain participant or reviewer only.",
      submitted_at: now,
      published_at: now,
      closed_at: null,
      deleted_at: null,
      terms_version: 1,
    },
    { onConflict: "id" },
  );
  if (offerError) throw offerError;

  const { error: cleanupInterestError } = await supabase
    .from("interests")
    .delete()
    .eq("offer_id", QA_OFFER_ID);
  if (cleanupInterestError) throw cleanupInterestError;

  const { error: cleanupCartError } = await supabase
    .from("offer_carts")
    .delete()
    .eq("offer_id", QA_OFFER_ID);
  if (cleanupCartError) throw cleanupCartError;

  const { error: cleanupCommentError } = await supabase
    .from("offer_comments")
    .delete()
    .eq("offer_id", QA_OFFER_ID);
  if (cleanupCommentError) throw cleanupCommentError;

  console.log(
    JSON.stringify(
      {
        projectRef: REQUIRED_QA_REF,
        ownerEmail: QA_OWNER_EMAIL,
        responderEmail: QA_RESPONDER_EMAIL,
        ownerUserId: owner.id,
        responderUserId: responder.id,
        offerId: QA_OFFER_ID,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Failed to seed isolated MoralTrade QA fixtures:", error);
  process.exitCode = 1;
});
