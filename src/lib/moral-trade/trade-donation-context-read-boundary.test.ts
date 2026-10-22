import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/lib/trade-donation.ts", "utf8");
const donationMigration = readFileSync(
  "supabase/migrations/20260722180000_every_org_pledge_donations.sql",
  "utf8",
);

function contextLoader() {
  const start = source.indexOf("export async function loadTradeDonationAgreementContext");
  const end = source.indexOf("\nexport function rpcRow", start);
  assert.ok(start >= 0 && end > start, "Donation agreement context loader was not found.");
  return source.slice(start, end);
}

test("donation context authorizes the participant before resolving private rows", () => {
  const loader = contextLoader();
  const participantClient = loader.indexOf("const participantSupabase = (await createClient()) as any;");
  const agreementRead = loader.indexOf('participantSupabase\n    .from("agreements")');
  const authorizationStop = loader.indexOf("if (agreementError || !agreement) return null;");
  const privateClient = loader.indexOf("const privateSupabase = createServiceClient() as any;");

  assert.ok(participantClient >= 0, "The cookie-bound participant client is required.");
  assert.ok(agreementRead > participantClient, "The participant client must read the agreement.");
  assert.ok(authorizationStop > agreementRead, "An unreadable agreement must fail closed.");
  assert.ok(
    privateClient > authorizationStop,
    "The service client must not exist until participant RLS authorizes the agreement.",
  );
});

test("only private donation rows bypass browser-role table denial", () => {
  const loader = contextLoader();

  assert.match(loader, /privateSupabase\s*\.from\("trade_donation_terms"\)/);
  assert.match(loader, /privateSupabase\s*\.from\("trade_donation_intents"\)/);
  assert.match(loader, /participantSupabase\s*\.from\("offers"\)/);
  assert.doesNotMatch(loader, /privateSupabase\s*\.from\("agreements"\)/);
  assert.doesNotMatch(loader, /privateSupabase\s*\.from\("offers"\)/);
});

test("donation terms and intents remain denied to browser roles", () => {
  assert.match(
    donationMigration,
    /revoke all on public\.trade_donation_terms from anon, authenticated;/i,
  );
  assert.match(
    donationMigration,
    /revoke all on public\.trade_donation_intents from anon, authenticated;/i,
  );
  assert.doesNotMatch(donationMigration, /grant\s+select\s+on\s+public\.trade_donation_(?:terms|intents)/i);
});
