import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, request as playwrightRequest } from '@playwright/test';

const required = (name) => {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const BASE_URL = required('AUTH_E2E_BASE_URL').replace(/\/$/, '');
const BYPASS = required('VERCEL_AUTOMATION_BYPASS_SECRET');
const DB_URL = required('PROD_SUPABASE_DB_URL');
const PASSWORD = required('QA_TEST_PASSWORD');
const RUN_ID = required('GITHUB_RUN_ID');
const HEAD_SHA = required('AUTH_E2E_HEAD_SHA');
const OUTPUT_DIR = process.env.AUTH_E2E_OUTPUT_DIR || 'auth-e2e-evidence';
const RUN_TAG = `mt-core-${RUN_ID}`;
const EMAIL_BASE = 'caijun054';
const emails = {
  a: `${EMAIL_BASE}+${RUN_TAG}-a@gmail.com`,
  b: `${EMAIL_BASE}+${RUN_TAG}-b@gmail.com`,
  c: `${EMAIL_BASE}+${RUN_TAG}-c@gmail.com`,
};

const result = {
  headSha: HEAD_SHA,
  preview: BASE_URL,
  runId: RUN_ID,
  runTag: RUN_TAG,
  checks: {},
  ids: {},
  screenshots: [],
  network: { pageErrors: [], serverErrors: [] },
};

await mkdir(OUTPUT_DIR, { recursive: true });

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const databaseUrl = new URL(DB_URL);
const postgresEnv = {
  ...process.env,
  PGDATABASE: decodeURIComponent(databaseUrl.pathname.replace(/^\//, '')),
  PGHOST: databaseUrl.hostname,
  PGPASSWORD: decodeURIComponent(databaseUrl.password),
  PGPORT: databaseUrl.port || '5432',
  PGSSLMODE: databaseUrl.searchParams.get('sslmode') || 'require',
  PGUSER: decodeURIComponent(databaseUrl.username),
};

function sql(query) {
  return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-At', '-c', query], {
    encoding: 'utf8',
    env: postgresEnv,
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

function sanitizeError(error) {
  const raw = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  return [DB_URL, BYPASS, PASSWORD]
    .filter(Boolean)
    .reduce((text, secret) => text.replaceAll(secret, '[redacted]'), raw)
    .slice(0, 20_000);
}

function cleanupSyntheticData() {
  const pattern = `${EMAIL_BASE}+${RUN_TAG}-%@gmail.com`;
  sql(`
    begin;
    create temporary table _mt_auth_e2e_users on commit drop as
      select id, email
      from auth.users
      where lower(email) like lower(${quote(pattern)});

    delete from public.email_outbox
    where lower(recipient_email) like lower(${quote(pattern)})
       or profile_id in (select id from _mt_auth_e2e_users);
    delete from public.email_nurture_subscriptions
    where lower(email) like lower(${quote(pattern)})
       or profile_id in (select id from _mt_auth_e2e_users);
    delete from public.funnel_events
    where profile_id in (select id from _mt_auth_e2e_users);
    delete from public.offers
    where owner_id in (select id from _mt_auth_e2e_users);
    delete from public.profiles
    where id in (select id from _mt_auth_e2e_users);
    delete from auth.identities
    where user_id in (select id from _mt_auth_e2e_users);
    delete from auth.users
    where id in (select id from _mt_auth_e2e_users);
    commit;
  `);
}

function dateOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function meaningful(page) {
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.body.innerText.replace(/\s+/g, ' ').trim().length > 60);
}

async function goto(page, route, { allow404 = false } = {}) {
  const url = route.startsWith('http') ? route : `${BASE_URL}${route}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  const status = response?.status() ?? 0;
  if (allow404) {
    assert.ok(status === 404 || status < 400, `Unexpected status ${status} for ${route}`);
  } else {
    assert.ok(status > 0 && status < 500, `Unexpected status ${status} for ${route}`);
  }
  await meaningful(page).catch(() => {});
  return response;
}

async function settle(page, previousUrl = '') {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  if (previousUrl) {
    await page.waitForFunction((url) => location.href !== url || document.readyState === 'complete', previousUrl).catch(() => {});
  }
  await page.waitForTimeout(600);
  await meaningful(page).catch(() => {});
}

async function clickSubmit(page, button, expectedUrl) {
  const previous = page.url();
  await button.click();
  if (expectedUrl) {
    await page.waitForURL(expectedUrl, { timeout: 30_000 }).catch(() => {});
  }
  await settle(page, previous);
}

async function shot(page, label) {
  const filename = `${label}.png`;
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: true, animations: 'disabled' });
  result.screenshots.push(filename);
  await writeFile(path.join(OUTPUT_DIR, `${label}.txt`), (await page.locator('body').innerText()).slice(0, 20_000));
}

function installDiagnostics(page, label) {
  page.on('pageerror', (error) => result.network.pageErrors.push({ label, message: error.message }));
  page.on('response', (response) => {
    if (response.status() >= 500) {
      result.network.serverErrors.push({ label, status: response.status(), url: response.url() });
    }
  });
}

async function signUp(page, email, label) {
  await goto(page, '/signup?returnTo=%2Fonboarding');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await clickSubmit(page, page.getByRole('button', { name: 'Create account' }), /\/login/);
  const body = await page.locator('body').innerText();
  assert.match(body, /Account created|Check your email/i, `${label} signup did not reach confirmation state`);
  const userId = sql(`select id::text from auth.users where lower(email)=lower(${quote(email)}) limit 1;`);
  assert.match(userId, /^[0-9a-f-]{36}$/i, `${label} signup did not create an Auth user`);
  sql(`update auth.users set email_confirmed_at=coalesce(email_confirmed_at, now()), confirmation_token='' where id=${quote(userId)}::uuid;`);
  result.ids[`user${label}`] = userId;
  result.checks[`signup${label}`] = true;
}

async function loginAndOnboard(page, email, label) {
  await goto(page, '/login?returnTo=%2Fonboarding');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await clickSubmit(page, page.getByRole('button', { name: 'Log in' }), /\/onboarding/);
  assert.match(page.url(), /\/onboarding/, `${label} did not return to onboarding after login`);
  await page.getByLabel('Counterparty, collaborator, or community').fill(`Synthetic ${RUN_TAG}`);
  await page.getByLabel('Referral source').fill('Authenticated core launch gate');
  await clickSubmit(page, page.getByRole('button', { name: /Save and start|Save completed profile/ }));
  const userId = result.ids[`user${label}`];
  const count = Number(sql(`select count(*) from public.cohort_onboarding_profiles where profile_id=${quote(userId)}::uuid and status='completed';`) || '0');
  assert.equal(count, 1, `${label} onboarding record was not persisted`);
  result.checks[`onboarding${label}`] = true;
  await shot(page, `${label.toLowerCase()}-onboarded`);
}

async function createOffer(page, suffix) {
  await goto(page, '/trades/new');
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Submit for review' }) });
  await form.locator('[name="offered_cause"]').fill(`Global poverty reduction ${RUN_TAG} ${suffix}`);
  await form.locator('[name="requested_cause"]').fill(`Animal welfare ${RUN_TAG} ${suffix}`);
  await form.locator('[name="proposed_action"]').fill(`Write a five-sentence public-safe research summary for ${RUN_TAG} ${suffix}.`);
  await form.locator('[name="requested_action"]').fill(`Complete one reversible vegetarian meal for ${RUN_TAG} ${suffix}.`);
  await form.locator('[name="no_trade_baseline"]').fill('Neither participant performs the additional synthetic action.');
  await form.locator('[name="duration"]').fill('7 days');
  await form.locator('[name="start_date"]').fill(dateOffset(1));
  await form.locator('[name="evidence_due_date"]').fill(dateOffset(14));
  await form.locator('[name="evidence_rule"]').fill('A private participant attestation describing the bounded synthetic action.');
  await form.locator('[name="maximum_burden"]').fill('At most fifteen minutes and no payment, donation, or sensitive information.');
  await form.locator('[name="privacy_scope"]').fill('Private to participants and operator; public evidence requires a separate redacted copy.');
  await form.locator('[name="exit_conditions"]').fill('Either participant may end future obligations using the recorded unilateral exit rule.');
  await form.locator('[name="notes"]').fill(`SYNTHETIC_AUTH_E2E_${RUN_TAG}_${suffix}`);
  await form.locator('[name="voluntary_certification"]').check();
  await form.locator('[name="public_evidence_certification"]').check();
  await clickSubmit(page, form.getByRole('button', { name: 'Submit for review' }), /\/trades\/[0-9a-f-]{36}\/manage/);
  const match = page.url().match(/\/trades\/([0-9a-f-]{36})\/manage/i);
  assert.ok(match, `Offer ${suffix} did not reach the manage route: ${page.url()}`);
  const offerId = match[1];
  const updated = sql(`update public.offers set workflow_status='published', status='open', published_at=coalesce(published_at,now()), moderation_reason='' where id=${quote(offerId)}::uuid and owner_id=${quote(result.ids.userA)}::uuid returning id::text;`);
  assert.equal(updated, offerId, `Offer ${suffix} was not published by the guarded operator step`);
  await goto(page, `/trades/${offerId}/manage`);
  await shot(page, `offer-${suffix.toLowerCase()}-published`);
  return offerId;
}

async function createInvitation(page, offerId, recipientEmail, suffix) {
  await goto(page, `/trades/${offerId}/invite`);
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Create 14-day invitation' }) });
  await form.locator('[name="recipient_email"]').fill(recipientEmail);
  await form.locator('[name="message"]').fill(`Review the bounded synthetic ${suffix} proposal.`);
  await clickSubmit(page, form.getByRole('button', { name: 'Create 14-day invitation' }));
  const preview = page.getByRole('link', { name: 'Preview' }).last();
  await preview.waitFor({ state: 'visible' });
  const href = await preview.getAttribute('href');
  assert.ok(href, `Invitation ${suffix} did not expose a preview link`);
  const parsed = new URL(href, BASE_URL);
  const invitationPath = `${parsed.pathname}${parsed.search}`;
  const token = parsed.pathname.split('/').filter(Boolean).at(-1);
  assert.match(token ?? '', /^[A-Za-z0-9_-]{20,}$/);
  result.ids[`invitation${suffix}`] = token;
  await shot(page, `invitation-${suffix.toLowerCase()}-created`);
  return invitationPath;
}

async function counterInvitation(page, invitationPath) {
  await goto(page, invitationPath);
  await page.getByText('Counter with different terms').click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Send counterproposal' }) });
  await form.locator('[name="message"]').fill('I accept with a shorter, clearer duration.');
  await form.locator('[name="duration"]').fill('6 days');
  await clickSubmit(page, form.getByRole('button', { name: 'Send counterproposal' }), /\/messages\/[0-9a-f-]{36}/);
  const match = page.url().match(/\/messages\/([0-9a-f-]{36})/i);
  assert.ok(match, `Counterproposal did not reach a private thread: ${page.url()}`);
  await shot(page, 'counterproposal-sent');
  return match[1];
}

async function acceptInvitation(page, invitationPath) {
  await goto(page, invitationPath);
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Accept these exact terms' }) });
  await form.locator('[name="message"]').fill('Accepted for the reversible synthetic exit-path test.');
  await clickSubmit(page, form.getByRole('button', { name: 'Accept these exact terms' }));
}

async function sendMessageAndAccept(page, threadId) {
  await goto(page, `/messages/${threadId}`);
  const messageForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Send private message' }) });
  await messageForm.locator('[name="body"]').fill(`Private launch-gate message ${RUN_TAG}.`);
  await clickSubmit(page, messageForm.getByRole('button', { name: 'Send private message' }));
  await page.getByText(`Private launch-gate message ${RUN_TAG}.`).waitFor();
  const accept = page.getByRole('button', { name: 'Accept and create agreement' });
  await accept.waitFor({ state: 'visible' });
  await clickSubmit(page, accept);
  const link = page.getByRole('link', { name: 'Open agreement' });
  await link.waitFor({ state: 'visible' });
  const href = await link.getAttribute('href');
  const match = String(href).match(/\/trade-agreements\/([0-9a-f-]{36})/i);
  assert.ok(match, 'Counterproposal acceptance did not expose the agreement record');
  await shot(page, 'thread-agreement-created');
  return match[1];
}

async function confirmCurrent(page, version) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: `Confirm version ${version}` }) });
  await form.locator('[name="terms_reviewed"]').check();
  await clickSubmit(page, form.getByRole('button', { name: `Confirm version ${version}` }));
}

async function createAmendment(page, agreementId) {
  await goto(page, `/trade-agreements/${agreementId}`);
  await page.getByText('Propose a new version before activation').click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Propose amendment' }) });
  await form.locator('[name="duration"]').fill('5 days');
  await clickSubmit(page, form.getByRole('button', { name: 'Propose amendment' }));
  await page.getByText(/Version 2 is the only version anyone may confirm/).waitFor();
  await shot(page, 'agreement-version-2-proposed');
}

async function assertOutsiderDenied(page, route, label) {
  const response = await goto(page, route, { allow404: true });
  const status = response?.status() ?? 0;
  const body = await page.locator('body').innerText();
  assert.ok(status === 404 || /not found|could not be found/i.test(body), `Outsider could access ${route}`);
  result.checks[label] = true;
  await shot(page, label);
}

async function submitChallengeReplaceAcceptPublish(a, b, agreementId) {
  await goto(a, `/trade-agreements/${agreementId}`);
  const submit = a.locator('form').filter({ has: a.getByRole('button', { name: 'Submit private evidence' }) });
  await submit.locator('[name="attestation"]').fill(`Private source attestation ${RUN_TAG}; includes a private detail that must not be published.`);
  await clickSubmit(a, submit.getByRole('button', { name: 'Submit private evidence' }));
  const privateCount = Number(sql(`select count(*) from public.trade_evidence_items where agreement_id=${quote(agreementId)}::uuid and public_visibility='private' and status='submitted';`) || '0');
  assert.equal(privateCount, 1, 'Evidence did not begin private and submitted');
  await shot(a, 'evidence-private-submitted');

  await goto(b, `/trade-agreements/${agreementId}`);
  const challenge = b.locator('form').filter({ has: b.getByRole('button', { name: 'Challenge evidence' }) });
  await challenge.locator('[name="challenge_reason"]').fill('Please replace the private source with a narrower attestation covering the exact test period.');
  await clickSubmit(b, challenge.getByRole('button', { name: 'Challenge evidence' }));
  await b.getByText(/Trade needs review|Evidence is challenged/i).waitFor();
  await shot(b, 'evidence-challenged');

  await goto(a, `/trade-agreements/${agreementId}`);
  await a.getByText('Replace this evidence').click();
  const replacement = a.locator('form').filter({ has: a.getByRole('button', { name: 'Submit replacement evidence' }) });
  await replacement.locator('[name="attestation"]').fill(`Replacement private attestation ${RUN_TAG}: the bounded action was completed during the stated period.`);
  await clickSubmit(a, replacement.getByRole('button', { name: 'Submit replacement evidence' }));
  await shot(a, 'evidence-replaced');

  await goto(b, `/trade-agreements/${agreementId}`);
  const accept = b.getByRole('button', { name: 'Accept evidence' });
  await accept.waitFor({ state: 'visible' });
  await clickSubmit(b, accept);
  await shot(b, 'replacement-evidence-accepted');

  await goto(a, `/trade-agreements/${agreementId}`);
  await a.getByText('Publish a separate redacted copy').click();
  const publish = a.locator('form').filter({ has: a.getByRole('button', { name: 'Publish redacted copy' }) });
  await publish.locator('[name="public_title"]').fill('Synthetic completion attestation');
  await publish.locator('[name="public_summary"]').fill(`Public-safe summary ${RUN_TAG}: a bounded synthetic action was completed.`);
  await publish.locator('[name="public_redaction_note"]').fill('Removed private contextual detail and retained only the bounded completion claim.');
  await publish.locator('[name="publication_certification"]').check();
  await clickSubmit(a, publish.getByRole('button', { name: 'Publish redacted copy' }));
  const safe = sql(`select jsonb_build_object('privateSourceStillPresent', attestation like 'Replacement private attestation%', 'publicSummarySafe', public_summary=${quote(`Public-safe summary ${RUN_TAG}: a bounded synthetic action was completed.`)}, 'visibility', public_visibility)::text from public.trade_evidence_items where agreement_id=${quote(agreementId)}::uuid and status='accepted' order by created_at desc limit 1;`);
  result.checks.evidencePrivacy = JSON.parse(safe);
  assert.equal(result.checks.evidencePrivacy.privateSourceStillPresent, true);
  assert.equal(result.checks.evidencePrivacy.publicSummarySafe, true);
  assert.equal(result.checks.evidencePrivacy.visibility, 'public');
  await shot(a, 'redacted-copy-published');
}

async function completeAgreement(a, b, agreementId) {
  await goto(a, `/trade-agreements/${agreementId}`);
  await clickSubmit(a, a.getByRole('button', { name: 'Confirm completion' }));
  await goto(b, `/trade-agreements/${agreementId}`);
  await clickSubmit(b, b.getByRole('button', { name: 'Confirm completion' }));
  await b.getByText('Completed by both participants').waitFor();
  const state = sql(`select lifecycle_status from public.agreements where id=${quote(agreementId)}::uuid;`);
  assert.equal(state, 'completed');
  result.checks.completedAgreement = true;
  await shot(b, 'final-deal-receipt');
}

async function activateExactAgreement(a, b, offerId) {
  const agreementId = sql(`select id::text from public.agreements where offer_id=${quote(offerId)}::uuid order by created_at desc limit 1;`);
  assert.match(agreementId, /^[0-9a-f-]{36}$/i, 'Accepted invitation did not create an agreement');
  await goto(a, `/trade-agreements/${agreementId}`);
  await confirmCurrent(a, 1);
  await goto(b, `/trade-agreements/${agreementId}`);
  await confirmCurrent(b, 1);
  await b.getByText('Trade is live.').waitFor();
  return agreementId;
}

async function exerciseExit(a, b, agreementId) {
  await goto(a, `/trade-agreements/${agreementId}`);
  const mutual = a.locator('form').filter({ has: a.getByRole('button', { name: 'Request mutual cancellation' }) });
  await mutual.locator('[name="reason"]').fill('Pause the synthetic test before any reliance increases.');
  await clickSubmit(a, mutual.getByRole('button', { name: 'Request mutual cancellation' }));

  await goto(b, `/trade-agreements/${agreementId}`);
  await clickSubmit(b, b.getByRole('button', { name: 'Decline', exact: true }));
  const active = sql(`select lifecycle_status from public.agreements where id=${quote(agreementId)}::uuid;`);
  assert.equal(active, 'active', 'Declining mutual cancellation changed agreement state');

  await goto(a, `/trade-agreements/${agreementId}`);
  const unilateral = a.locator('form').filter({ has: a.getByRole('button', { name: 'End future obligations' }) });
  await unilateral.locator('[name="reason"]').fill('Using the published unilateral exit rule for the synthetic test.');
  await clickSubmit(a, unilateral.getByRole('button', { name: 'End future obligations' }));
  await a.getByText('Trade ended.').waitFor();
  const cancelled = sql(`select lifecycle_status from public.agreements where id=${quote(agreementId)}::uuid;`);
  assert.equal(cancelled, 'cancelled');
  result.checks.exitPath = true;
  await shot(a, 'unilateral-exit-recorded');
}

const api = await playwrightRequest.newContext({
  extraHTTPHeaders: {
    'x-vercel-protection-bypass': BYPASS,
    'x-vercel-set-bypass-cookie': 'true',
  },
});
const healthResponse = await api.get(`${BASE_URL}/api/health`);
assert.ok([200, 503].includes(healthResponse.status()), `Health returned ${healthResponse.status()}`);
const health = await healthResponse.json();
result.health = health;
assert.equal(health.checks?.databaseAvailable, true, 'Preview database unavailable');
assert.equal(health.checks?.requiredDatabaseContractReady, true, 'Preview database contract unavailable');
assert.equal(health.checks?.privilegedClientConfigured, true, 'Preview service-role client unavailable');
assert.equal(health.checks?.encryptionConfigured, true, 'Preview encryption configuration unavailable');
await api.dispose();

const browser = await chromium.launch({ headless: true });
const contexts = {};
const pages = {};
try {
  for (const label of ['A', 'B', 'C']) {
    const context = await browser.newContext({
      viewport: { width: label === 'C' ? 390 : 1440, height: label === 'C' ? 844 : 960 },
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': BYPASS,
        'x-vercel-set-bypass-cookie': 'true',
      },
    });
    contexts[label] = context;
    pages[label] = await context.newPage();
    pages[label].setDefaultTimeout(25_000);
    pages[label].setDefaultNavigationTimeout(40_000);
    installDiagnostics(pages[label], label);
  }

  await signUp(pages.A, emails.a, 'A');
  await signUp(pages.B, emails.b, 'B');
  await signUp(pages.C, emails.c, 'C');
  await loginAndOnboard(pages.A, emails.a, 'A');
  await loginAndOnboard(pages.B, emails.b, 'B');
  await loginAndOnboard(pages.C, emails.c, 'C');

  const happyOffer = await createOffer(pages.A, 'HAPPY');
  result.ids.happyOffer = happyOffer;
  const invitationPath = await createInvitation(pages.A, happyOffer, emails.b, 'HAPPY');
  const threadId = await counterInvitation(pages.B, invitationPath);
  result.ids.happyThread = threadId;
  const agreementId = await sendMessageAndAccept(pages.A, threadId);
  result.ids.happyAgreement = agreementId;

  await goto(pages.B, `/trade-agreements/${agreementId}`);
  await pages.B.getByRole('button', { name: 'Confirm version 1' }).waitFor();
  await createAmendment(pages.A, agreementId);
  const staleForm = pages.B.locator('form').filter({ has: pages.B.getByRole('button', { name: 'Confirm version 1' }) });
  await staleForm.locator('[name="terms_reviewed"]').check();
  await clickSubmit(pages.B, staleForm.getByRole('button', { name: 'Confirm version 1' }));
  const staleBody = await pages.B.locator('body').innerText();
  assert.match(staleBody, /changed after you reviewed|current frozen version|Review the current/i, 'Stale version submission was not rejected visibly');
  result.checks.staleVersionRejected = true;
  await shot(pages.B, 'stale-version-rejected');

  await goto(pages.B, `/trade-agreements/${agreementId}`);
  await confirmCurrent(pages.B, 2);
  await goto(pages.A, `/trade-agreements/${agreementId}`);
  await confirmCurrent(pages.A, 2);
  await pages.A.getByText('Trade is live.').waitFor();
  result.checks.bilateralActivation = true;
  await shot(pages.A, 'bilateral-agreement-active');

  await assertOutsiderDenied(pages.C, `/messages/${threadId}`, 'outsider-thread-denied');
  await assertOutsiderDenied(pages.C, `/trade-agreements/${agreementId}`, 'outsider-agreement-denied');
  await submitChallengeReplaceAcceptPublish(pages.A, pages.B, agreementId);
  await completeAgreement(pages.A, pages.B, agreementId);

  const exitOffer = await createOffer(pages.A, 'EXIT');
  result.ids.exitOffer = exitOffer;
  const exitInvitation = await createInvitation(pages.A, exitOffer, emails.b, 'EXIT');
  await acceptInvitation(pages.B, exitInvitation);
  const exitAgreement = await activateExactAgreement(pages.A, pages.B, exitOffer);
  result.ids.exitAgreement = exitAgreement;
  await exerciseExit(pages.A, pages.B, exitAgreement);

  const audit = sql(`select jsonb_build_object(
    'happyLifecycle', (select lifecycle_status from public.agreements where id=${quote(agreementId)}::uuid),
    'exitLifecycle', (select lifecycle_status from public.agreements where id=${quote(exitAgreement)}::uuid),
    'happyVersions', (select count(*) from public.trade_agreement_versions where agreement_id=${quote(agreementId)}::uuid),
    'happyConfirmations', (select count(*) from public.trade_agreement_confirmations c join public.trade_agreement_versions v on v.id=c.agreement_version_id where v.agreement_id=${quote(agreementId)}::uuid),
    'acceptedEvidence', (select count(*) from public.trade_evidence_items where agreement_id=${quote(agreementId)}::uuid and status='accepted'),
    'completionConfirmations', (select count(*) from public.trade_completion_confirmations where agreement_id=${quote(agreementId)}::uuid),
    'outsiderThreadReads', (select count(*) from public.trade_thread_reads where thread_id=${quote(threadId)}::uuid and user_id=${quote(result.ids.userC)}::uuid)
  )::text;`);
  result.audit = JSON.parse(audit);
  assert.equal(result.audit.happyLifecycle, 'completed');
  assert.equal(result.audit.exitLifecycle, 'cancelled');
  assert.equal(Number(result.audit.happyVersions), 2);
  assert.equal(Number(result.audit.acceptedEvidence), 1);
  assert.equal(Number(result.audit.completionConfirmations), 2);
  assert.equal(Number(result.audit.outsiderThreadReads), 0);
  assert.deepEqual(result.network.pageErrors, [], 'Browser page errors were detected');
  assert.deepEqual(result.network.serverErrors, [], 'Server-error responses were detected');
  result.checks.browserDiagnostics = true;
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.error = { message: sanitizeError(error) };
  throw error;
} finally {
  for (const context of Object.values(contexts)) await context.close().catch(() => {});
  await browser.close().catch(() => {});
  try {
    cleanupSyntheticData();
    result.cleanup = { completed: true };
  } catch (cleanupError) {
    result.cleanup = { completed: false, error: sanitizeError(cleanupError) };
  }
  await writeFile(path.join(OUTPUT_DIR, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
}
