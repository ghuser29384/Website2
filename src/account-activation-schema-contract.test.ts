import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260814042516_account_activation_stage.sql";
const migration = readFileSync(migrationPath, "utf8");
const activationResolver = readFileSync("src/lib/account-activation.ts", "utf8");
const rootPage = readFileSync("src/app/page.tsx", "utf8");
const walkthroughPage = readFileSync("src/app/walkthrough/page.tsx", "utf8");
const completeProfilePage = readFileSync("src/app/complete-profile/page.tsx", "utf8");
const unavailablePage = readFileSync("src/app/account-state-unavailable/page.tsx", "utf8");
const privacyControls = readFileSync("src/lib/background-privacy-controls.ts", "utf8");
const walkthroughAction = readFileSync("src/app/walkthrough/actions.ts", "utf8");
const completeProfileAction = readFileSync("src/app/complete-profile/actions.ts", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");
const authActions = readFileSync("src/app/actions.ts", "utf8");
const authCallback = readFileSync("src/app/auth/confirm/route.ts", "utf8");

test("the atomic migration grandfathers rows before installing the new-account default", () => {
  const grandfather = migration.indexOf("set activation_stage = 'setup_complete'");
  const newAccountDefault = migration.indexOf(
    "alter column activation_stage set default 'walkthrough_required'",
  );

  assert.ok(grandfather >= 0);
  assert.ok(newAccountDefault > grandfather);
  assert.match(migration, /alter column activation_stage set not null/i);
  assert.match(
    migration,
    /activation_stage in \(\s*'walkthrough_required',\s*'sparks_required',\s*'setup_complete'/i,
  );
});

test("activation writes are client-denied and exposed only as narrow service transitions", () => {
  assert.match(
    migration,
    /revoke insert, update on table public\.profiles from anon, authenticated/i,
  );
  assert.doesNotMatch(
    migration.match(/grant update \([\s\S]*?\) on public\.profiles to authenticated/i)?.[0] ?? "",
    /activation_stage/i,
  );
  assert.match(migration, /security definer\s+set search_path = ''/gi);
  assert.match(migration, /p_actor_profile_id is distinct from p_profile_id/gi);
  assert.match(
    migration,
    /revoke all on function public\.complete_walkthrough_activation_v1\(uuid, uuid\)[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.complete_profile_activation_v1\(uuid, uuid\)\s+to service_role/i,
  );
});

test("App Router owns root and Walkthrough without static or cookie routing authority", () => {
  assert.equal(existsSync("proxy.ts"), false);
  assert.match(rootPage, /getRootActivationDestination/);
  assert.match(walkthroughPage, /getWalkthroughActivationDestination/);
  assert.doesNotMatch(rootPage + walkthroughPage, /mt_walkthrough_seen|cohort_onboarding_profiles/);
  assert.doesNotMatch(
    nextConfig,
    /source:\s*"\/walkthrough"[\s\S]{0,100}destination:\s*"\/moral-trade-production\.html"/,
  );
  assert.equal(existsSync("public/moral-trade-production.html"), true);
});

test("unavailable account state terminates at a truthful non-activation surface", () => {
  assert.match(
    activationResolver,
    /ACCOUNT_ACTIVATION_UNAVAILABLE_PATH = "\/account-state-unavailable"/,
  );
  assert.match(rootPage, /getRootActivationDestination/);
  assert.match(walkthroughPage, /getWalkthroughActivationDestination/);
  assert.match(completeProfilePage, /getCompleteProfileActivationDestination/);
  assert.match(unavailablePage, /did not classify this[\s\S]*account as new/i);
  assert.match(unavailablePage, /No activation stage was changed/);
  assert.match(unavailablePage, /robots:[\s\S]*index: false[\s\S]*follow: false/);
  assert.doesNotMatch(unavailablePage, /href="\/(?:walkthrough|complete-profile|feed)"/);
  assert.match(privacyControls, /ACTIVATION_NO_STORE_ROUTES[\s\S]*account-state-unavailable/);
});

test("Walkthrough persists its transition before Complete Profile routing", () => {
  const rpc = walkthroughAction.indexOf("complete_walkthrough_activation_v1");
  const destination = walkthroughAction.lastIndexOf(
    "redirect(buildWalkthroughCompleteProfilePath(draft))",
  );
  assert.ok(rpc >= 0);
  assert.ok(destination > rpc);
  assert.match(walkthroughAction, /p_actor_profile_id: viewer\.authUser\.id/);
  assert.match(walkthroughAction, /transitionedStage !== "sparks_required"/);
});

test("every direct authentication success path consults persisted activation", () => {
  assert.match(authActions, /signUpAction[\s\S]*getPostAuthActivationDestination/);
  assert.match(authActions, /signInAction[\s\S]*getPostAuthActivationDestination/);
  assert.match(authCallback, /exchangeCodeForSession[\s\S]*getPostAuthActivationDestination/);
  assert.match(authCallback, /verifyOtp[\s\S]*getPostAuthActivationDestination/);
  assert.match(
    authActions,
    /signInAction[\s\S]*let destination = ACCOUNT_ACTIVATION_UNAVAILABLE_PATH/,
  );
  assert.equal(
    authCallback.match(/let destination = ACCOUNT_ACTIVATION_UNAVAILABLE_PATH/g)?.length,
    2,
  );
});

test("Complete Profile advances only after every required profile write succeeds", () => {
  const profileWrite = completeProfileAction.indexOf('.from("profiles")');
  const onboardingWrite = completeProfileAction.indexOf('.from("cohort_onboarding_profiles")');
  const wishWrite = completeProfileAction.indexOf('.from("wish_profiles")');
  const synthesisWrite = completeProfileAction.indexOf('.from("profile_syntheses")');
  const activationRpc = completeProfileAction.indexOf("complete_profile_activation_v1");

  assert.ok(profileWrite >= 0);
  assert.ok(onboardingWrite > profileWrite);
  assert.ok(wishWrite > onboardingWrite);
  assert.ok(synthesisWrite > wishWrite);
  assert.ok(activationRpc > synthesisWrite);
  assert.match(
    completeProfileAction.slice(synthesisWrite, activationRpc),
    /if \(synthesisError\)[\s\S]*redirectWithMessage/,
  );
  assert.match(completeProfileAction, /transitionedStage !== "setup_complete"/);
});
