import fs from "node:fs";
import path from "node:path";

const manifestPath = required("ISSUE782_MANIFEST_PATH", process.env.ISSUE782_MANIFEST_PATH);
const outputDir = required("ISSUE782_GENERATED_DIR", process.env.ISSUE782_GENERATED_DIR);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function required(name, value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment value: ${name}`);
  }
  return value;
}

function assertUuid(name, value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`Malformed ${name}: ${value}`);
  }
}

function assertEmail(name, value) {
  if (!/^[a-z0-9][a-z0-9._+-]{0,63}@qa\.moraltrade\.invalid$/.test(value)) {
    throw new Error(`Unsafe ${name}: ${value}`);
  }
}

for (const [role, user] of Object.entries(manifest.users ?? {})) {
  assertUuid(`${role} user id`, user.id);
  assertEmail(`${role} email`, user.email);
}
for (const [name, value] of Object.entries(manifest.proposals ?? {})) assertUuid(`${name} proposal`, value);
for (const [name, value] of Object.entries(manifest.submissions ?? {})) assertUuid(`${name} submission`, value);
if (!/^[a-z0-9][a-z0-9-]{6,38}$/.test(manifest.prefix ?? "")) {
  throw new Error(`Unsafe run prefix: ${manifest.prefix}`);
}

fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });

const FIXED = {
  users: {
    creator: {
      id: "ca111111-1111-4111-8111-111111111111",
      email: "dac-product-creator@qa.invalid",
    },
    reviewer: {
      id: "cb222222-2222-4222-8222-222222222222",
      email: "dac-product-reviewer@qa.invalid",
    },
    pledger: {
      id: "cc333333-3333-4333-8333-333333333333",
      email: "dac-product-pledger@qa.invalid",
    },
    outsider: {
      id: "cd444444-4444-4444-8444-444444444444",
      email: "dac-product-outsider@qa.invalid",
    },
  },
  proposals: {
    open: "ce555555-5555-4555-8555-555555555555",
    success: "cf666666-6666-4666-8666-666666666666",
    lapse: "c0777777-7777-4777-8777-777777777777",
  },
  submissions: {
    open: "d1111111-1111-4111-8111-111111111111",
    success: "d2222222-2222-4222-8222-222222222222",
    lapse: "d3333333-3333-4333-8333-333333333333",
  },
};

const campaign = (proposalId) => `campaign-${proposalId.replaceAll("-", "")}`;
const replacements = new Map();
for (const role of Object.keys(FIXED.users)) {
  replacements.set(FIXED.users[role].id, manifest.users[role].id);
  replacements.set(FIXED.users[role].email, manifest.users[role].email);
}
for (const scenario of Object.keys(FIXED.proposals)) {
  replacements.set(FIXED.proposals[scenario], manifest.proposals[scenario]);
  replacements.set(FIXED.submissions[scenario], manifest.submissions[scenario]);
  replacements.set(campaign(FIXED.proposals[scenario]), campaign(manifest.proposals[scenario]));
}
replacements.set("qa-dac-product", manifest.prefix);
replacements.set("mpgf_dac_product_browser", `${manifest.prefix.replaceAll("-", "_")}_browser`);

function applyReplacements(source) {
  let output = source;
  const ordered = [...replacements.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of ordered) output = output.split(from).join(to);
  return output;
}

function stripDirectAuthCreation(source) {
  const start = source.indexOf("insert into auth.users (");
  const end = source.indexOf("insert into public.profiles", start);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not isolate the fixed Auth insertion block in the DAC fixture.");
  }
  return source.slice(0, start) + source.slice(end);
}

function stripDirectAuthCleanup(source) {
  let output = source;
  for (const table of ["mfa_factors", "sessions", "refresh_tokens", "identities", "users"]) {
    const pattern = new RegExp(`\\ndelete from auth\\.${table}\\n[\\s\\S]*?;\\n`, "g");
    output = output.replace(pattern, "\n");
  }
  return output;
}

const fixtureSourcePath = "supabase/tests/mpgf_dac_product_browser_fixture.sql";
const cleanupSourcePath = "supabase/tests/mpgf_dac_product_browser_cleanup.sql";
const specSourcePath = "tests/mpgf-dac-product-lifecycle.spec.ts";

let fixture = fs.readFileSync(fixtureSourcePath, "utf8");
fixture = applyReplacements(stripDirectAuthCreation(fixture));
fixture = fixture.replaceAll("Synthetic isolated-QA", `Synthetic production UAT ${manifest.namespace}`);
fixture = fixture.replaceAll("isolated-QA", `run-owned production UAT ${manifest.namespace}`);

let cleanup = fs.readFileSync(cleanupSourcePath, "utf8");
cleanup = applyReplacements(stripDirectAuthCleanup(cleanup));

let spec = fs.readFileSync(specSourcePath, "utf8");
spec = applyReplacements(spec)
  .replace("context.setDefaultTimeout(12_000);", "context.setDefaultTimeout(25_000);")
  .replace("context.setDefaultNavigationTimeout(25_000);", "context.setDefaultNavigationTimeout(60_000);")
  .replace(
    'const SCREENSHOT_DIR = "test-results/mpgf-dac-product-lifecycle";',
    `const SCREENSHOT_DIR = "test-results/${manifest.prefix}-dac-lifecycle";`,
  );

const contractMarker = `select * from public.mpgf_begin_pool_proposal_review('${manifest.proposals.open}'`;
const markerIndex = fixture.indexOf(contractMarker);
if (markerIndex < 0) throw new Error("Could not find the first lifecycle transition in the rendered fixture.");
const setupPrefix = fixture.slice(0, markerIndex);
const contract = `${setupPrefix}

do $issue782$
declare
  denied boolean;
begin
  denied := false;
  begin
    perform public.mpgf_assert_authorized_pool_reviewer(
      '${manifest.users.creator.id}'::uuid,
      '${manifest.proposals.open}'::uuid
    );
  exception when others then
    denied := true;
  end;
  if not denied then raise exception 'creator self-review authorization unexpectedly succeeded'; end if;

  denied := false;
  begin
    perform public.mpgf_assert_authorized_pool_reviewer(
      '${manifest.users.outsider.id}'::uuid,
      '${manifest.proposals.open}'::uuid
    );
  exception when others then
    denied := true;
  end;
  if not denied then raise exception 'outsider reviewer authorization unexpectedly succeeded'; end if;
end
$issue782$;

select * from public.mpgf_begin_pool_proposal_review(
  '${manifest.proposals.open}',
  '${manifest.users.reviewer.id}',
  'Issue 782 rollback-only authorized reviewer transition'
);

do $issue782$
declare
  denied boolean := false;
begin
  begin
    update public.mpgf_pool_proposals
       set title = title || ' forbidden mutation'
     where id = '${manifest.proposals.open}'::uuid;
  exception when others then
    denied := true;
  end;
  if not denied then raise exception 'post-review material mutation unexpectedly succeeded'; end if;
end
$issue782$;

select * from public.mpgf_reject_pool_proposal(
  '${manifest.proposals.open}',
  '${manifest.users.reviewer.id}',
  'Issue 782 rollback-only rejection path'
);

do $issue782$
declare
  denied boolean := false;
  observed_status text;
begin
  select status into observed_status
    from public.mpgf_pool_proposals
   where id = '${manifest.proposals.open}'::uuid;
  if observed_status <> 'rejected' then
    raise exception 'rejection transition did not persist inside rollback-only proof';
  end if;
  begin
    perform public.mpgf_approve_and_freeze_pool_proposal(
      '${manifest.proposals.open}'::uuid,
      '${manifest.users.reviewer.id}'::uuid,
      'forbidden replay after rejection'
    );
  exception when others then
    denied := true;
  end;
  if not denied then raise exception 'approval after rejection unexpectedly succeeded'; end if;
end
$issue782$;

select jsonb_build_object(
  'status','passed',
  'creatorSelfReviewDenied',true,
  'outsiderReviewDenied',true,
  'authorizedReviewStarted',true,
  'postReviewMutationDenied',true,
  'authorizedRejectionRecorded',true,
  'approvalAfterRejectionDenied',true,
  'productionMutationRetained',false
);
rollback;
`;

const fixedMarkers = [
  ...Object.values(FIXED.users).flatMap((value) => [value.id, value.email]),
  ...Object.values(FIXED.proposals),
  ...Object.values(FIXED.submissions),
  "qa-dac-product",
];
for (const [name, rendered] of { fixture, cleanup, spec, contract }.entries()) {
  for (const marker of fixedMarkers) {
    if (rendered.includes(marker)) throw new Error(`${name} retained fixed marker ${marker}`);
  }
}
if (/insert into auth\.users|insert into auth\.identities/i.test(fixture)) {
  throw new Error("Rendered fixture still writes Auth tables directly.");
}
if (/delete from auth\.(?:mfa_factors|sessions|refresh_tokens|identities|users)/i.test(cleanup)) {
  throw new Error("Rendered cleanup still deletes Auth tables directly.");
}

const outputs = {
  fixture: path.join(outputDir, "issue782-fixture.sql"),
  cleanup: path.join(outputDir, "issue782-cleanup.sql"),
  contract: path.join(outputDir, "issue782-rejection-and-denial-contract.sql"),
  spec: path.join("tests", "issue782-generated-dac-product-lifecycle.spec.ts"),
};
fs.writeFileSync(outputs.fixture, fixture, { mode: 0o600 });
fs.writeFileSync(outputs.cleanup, cleanup, { mode: 0o600 });
fs.writeFileSync(outputs.contract, contract, { mode: 0o600 });
fs.writeFileSync(outputs.spec, spec, { mode: 0o600 });

const redacted = {
  schemaVersion: 1,
  namespace: manifest.namespace,
  prefix: manifest.prefix,
  userCount: Object.keys(manifest.users).length,
  proposalCount: Object.keys(manifest.proposals).length,
  submissionCount: Object.keys(manifest.submissions).length,
  directAuthCreationRemoved: true,
  directAuthCleanupRemoved: true,
  fixedMarkersAbsent: true,
  generatedFiles: Object.values(outputs),
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(outputDir, "render-summary.json"), `${JSON.stringify(redacted, null, 2)}\n`, {
  mode: 0o600,
});
console.log(JSON.stringify({ status: "passed", ...redacted }));
