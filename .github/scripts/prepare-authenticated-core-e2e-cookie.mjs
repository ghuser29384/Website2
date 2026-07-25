import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const path = '.github/scripts/authenticated-core-e2e.mjs';
let source = await readFile(path, 'utf8');

function replaceOnce(oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  assert.equal(count, 1, `${label}: expected one source block, found ${count}`);
  source = source.replace(oldText, newText);
}

replaceOnce(
  "import { mkdir, writeFile } from 'node:fs/promises';",
  "import { mkdir, readFile, writeFile } from 'node:fs/promises';",
  'filesystem import',
);

replaceOnce(
  "const BYPASS = required('VERCEL_AUTOMATION_BYPASS_SECRET');",
  [
    "const BYPASS = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '').trim();",
    "const COOKIE_FILE = String(process.env.VERCEL_BYPASS_COOKIE_FILE ?? '').trim();",
    "if (!BYPASS && !COOKIE_FILE) throw new Error('Vercel preview access configuration is missing.');",
  ].join('\n'),
  'preview access configuration',
);

const cleanupBlock = `function cleanupSyntheticData() {
  const pattern = \`\${EMAIL_BASE}+\${RUN_TAG}-%@gmail.com\`;
  sql(\`
    begin;
    create temporary table _mt_auth_e2e_users on commit drop as
      select id, email
      from auth.users
      where lower(email) like lower(\${quote(pattern)});

    delete from public.email_outbox
    where lower(recipient_email) like lower(\${quote(pattern)})
       or profile_id in (select id from _mt_auth_e2e_users);
    delete from public.email_nurture_subscriptions
    where lower(email) like lower(\${quote(pattern)})
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
  \`);
}
`;

const cookieParser = `${cleanupBlock}
async function loadProtectionState() {
  if (!COOKIE_FILE) return { cookies: [], origins: [] };
  const cookieJar = await readFile(COOKIE_FILE, 'utf8');
  const cookies = cookieJar
    .split(/\\r?\\n/)
    .filter((line) => line && (!line.startsWith('#') || line.startsWith('#HttpOnly_')))
    .map((line) => {
      const httpOnly = line.startsWith('#HttpOnly_');
      const normalized = httpOnly ? line.slice('#HttpOnly_'.length) : line;
      const fields = normalized.split('\\t');
      if (fields.length < 7) return null;
      const [domain, , cookiePath, secure, expires, name, value] = fields;
      if (!name || !value) return null;
      return {
        domain,
        expires: Number(expires) || -1,
        httpOnly,
        name,
        path: cookiePath || '/',
        sameSite: 'Lax',
        secure: secure === 'TRUE',
        value,
      };
    })
    .filter(Boolean);
  assert.ok(cookies.length > 0, 'Vercel preview access cookie was not generated.');
  return { cookies, origins: [] };
}
`;

replaceOnce(cleanupBlock, cookieParser, 'cookie parser insertion');

replaceOnce(
  `const api = await playwrightRequest.newContext({
  extraHTTPHeaders: {
    'x-vercel-protection-bypass': BYPASS,
    'x-vercel-set-bypass-cookie': 'true',
  },
});`,
  `const protectionHeaders = BYPASS
  ? {
      'x-vercel-protection-bypass': BYPASS,
      'x-vercel-set-bypass-cookie': 'true',
    }
  : {};
const protectionState = await loadProtectionState();
const api = await playwrightRequest.newContext({
  extraHTTPHeaders: protectionHeaders,
  storageState: protectionState,
});`,
  'API preview access',
);

replaceOnce(
  `    const context = await browser.newContext({
      viewport: { width: label === 'C' ? 390 : 1440, height: label === 'C' ? 844 : 960 },
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': BYPASS,
        'x-vercel-set-bypass-cookie': 'true',
      },
    });`,
  `    const context = await browser.newContext({
      viewport: { width: label === 'C' ? 390 : 1440, height: label === 'C' ? 844 : 960 },
      extraHTTPHeaders: protectionHeaders,
      storageState: protectionState,
    });`,
  'browser preview access',
);

await writeFile(path, source, 'utf8');
