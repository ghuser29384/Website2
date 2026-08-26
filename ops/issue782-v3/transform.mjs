import { spawnSync } from "node:child_process";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

function load(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writePrivate(path, value) {
  writeFileSync(path, value, { mode: 0o600 });
  chmodSync(path, 0o600);
}

const sourceRoot = required("I782_SOURCE_ROOT");
const stateDir = required("I782_STATE_DIR");
const original = join(sourceRoot, "controller/issue782/transform-fixtures-v2-original.mjs");
const result = spawnSync(process.execPath, [original], {
  cwd: sourceRoot,
  env: process.env,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) {
  throw new Error(`Original exact-owned fixture transform failed with status ${result.status}`);
}

const authState = load(required("I782_AUTH_STATE"));
const users = Object.entries(authState.users ?? {});
if (users.length !== 6) {
  throw new Error(`Expected exactly six run-owned Auth identities; found ${users.length}`);
}

const ids = users.map(([role, entry]) => {
  if (!entry?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.id)) {
    throw new Error(`Missing or malformed exact Auth ID for role ${role}`);
  }
  return entry.id;
});
if (new Set(ids).size !== ids.length) {
  throw new Error("Run-owned Auth IDs are not unique");
}

const quotedIds = ids.map((id) => `'${id}'`).join(",\n  ");
const profileCleanup = `\\set ON_ERROR_STOP on

begin;

delete from moral_trade_private.person_accounts
where profile_id in (
  ${quotedIds}
);

delete from public.profiles
where id in (
  ${quotedIds}
);

commit;
`;
writePrivate(join(stateDir, "profile-cleanup.sql"), profileCleanup);

const zeroPath = join(stateDir, "zero.sql");
const zeroSql = readFileSync(zeroPath, "utf8");
for (const id of ids) {
  if (!zeroSql.includes(id)) {
    throw new Error(`Zero-residue proof omits exact Auth ID ${id}`);
  }
}

const evidencePath = join(stateDir, "transform-evidence.json");
const evidence = load(evidencePath);
const updatedEvidence = {
  ...evidence,
  allSyntheticProfilesIncluded: true,
  exactSyntheticProfileCount: ids.length,
  probeProfilesIncluded: true,
  v3CleanupHardenedAt: new Date().toISOString(),
};
writePrivate(evidencePath, `${JSON.stringify(updatedEvidence, null, 2)}\n`);

console.log(
  JSON.stringify({
    schemaVersion: 3,
    allSyntheticProfilesIncluded: true,
    exactSyntheticProfileCount: ids.length,
    zeroResidueProofIncludesEveryAuthId: true,
  }),
);
