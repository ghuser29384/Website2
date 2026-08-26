import { appendFileSync, chmodSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

function load(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function save(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

const mode = required("I782_AUTH_MODE");
const url = required("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
const plannedPath = required("I782_PLANNED_MANIFEST");
const statePath = required("I782_AUTH_STATE");
const evidencePath = required("I782_AUTH_EVIDENCE");
const planned = load(plannedPath);
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const roleOrder = ["creator", "reviewer", "pledger", "outsider", "probe_pre", "probe_canonical"];

if (mode === "create") {
  const password = required("I782_QA_PASSWORD");
  const state = {
    schemaVersion: 1,
    namespaceHandle: planned.namespaceHandle,
    namespaceSha256: planned.namespaceSha256,
    users: {},
    createdAt: new Date().toISOString(),
  };
  save(statePath, state);

  for (const role of roleOrder) {
    const email = planned.roles?.[role]?.email;
    if (!email || !email.endsWith(".invalid")) throw new Error(`Unsafe planned email for ${role}`);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        provider: "email",
        providers: ["email"],
        issue782_namespace: planned.namespaceHandle,
        issue782_role: role,
      },
      user_metadata: {
        display_name: `Issue 782 synthetic ${role.replaceAll("_", " ")}`,
        issue782_namespace: planned.namespaceHandle,
        issue782_role: role,
      },
    });
    if (error || !data.user?.id) {
      save(statePath, state);
      throw new Error(`Supabase administrative creation failed for ${role}: ${error?.message ?? "missing user"}`);
    }
    state.users[role] = {
      id: data.user.id,
      email,
      deleted: false,
    };
    save(statePath, state);
  }

  const githubEnv = required("GITHUB_ENV");
  const envNames = {
    creator: "I782_CREATOR_ID",
    reviewer: "I782_REVIEWER_ID",
    pledger: "I782_PLEDGER_ID",
    outsider: "I782_OUTSIDER_ID",
    probe_pre: "I782_PROBE_PRE_ID",
    probe_canonical: "I782_PROBE_CANONICAL_ID",
  };
  for (const role of roleOrder) appendFileSync(githubEnv, `${envNames[role]}=${state.users[role].id}\n`);
  const evidence = {
    schemaVersion: 1,
    namespaceHandle: planned.namespaceHandle,
    namespaceSha256: planned.namespaceSha256,
    administrativeApiUsed: true,
    emailDeliveryRequested: false,
    userCount: roleOrder.length,
    roles: roleOrder,
    createdAt: state.createdAt,
  };
  save(evidencePath, evidence);
  console.log(JSON.stringify(evidence));
  process.exit(0);
}

if (mode === "delete-probe") {
  const role = required("I782_PROBE_ROLE");
  if (!roleOrder.includes(role) || !role.startsWith("probe_")) throw new Error("Invalid probe role");
  const state = load(statePath);
  const user = state.users?.[role];
  if (!user?.id) throw new Error(`Missing exact probe identity for ${role}`);
  if (!user.deleted) {
    const { error } = await admin.auth.admin.deleteUser(user.id, false);
    if (error && !/not found/i.test(error.message)) throw new Error(`Probe deletion failed: ${error.message}`);
    user.deleted = true;
    user.deletedAt = new Date().toISOString();
    save(statePath, state);
  }
  console.log(JSON.stringify({ role, exactUserIdDeleted: true }));
  process.exit(0);
}

if (mode === "cleanup") {
  const state = load(statePath);
  const results = [];
  for (const role of [...roleOrder].reverse()) {
    const user = state.users?.[role];
    if (!user?.id || user.deleted) {
      results.push({ role, alreadyAbsent: true });
      continue;
    }
    const { error } = await admin.auth.admin.deleteUser(user.id, false);
    if (error && !/not found/i.test(error.message)) {
      results.push({ role, deleted: false, error: error.message });
      continue;
    }
    user.deleted = true;
    user.deletedAt = new Date().toISOString();
    results.push({ role, deleted: true });
    save(statePath, state);
  }
  const failures = results.filter((entry) => entry.deleted === false);
  const evidence = {
    schemaVersion: 1,
    namespaceHandle: state.namespaceHandle,
    exactAdministrativeDeletion: failures.length === 0,
    rolesProcessed: results.length,
    failures: failures.map((entry) => ({ role: entry.role })),
    completedAt: new Date().toISOString(),
  };
  save(evidencePath, evidence);
  console.log(JSON.stringify(evidence));
  if (failures.length) process.exit(1);
  process.exit(0);
}

throw new Error(`Unsupported I782_AUTH_MODE: ${mode}`);
