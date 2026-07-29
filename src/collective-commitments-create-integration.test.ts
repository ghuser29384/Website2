import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("the canonical Create route owns Collective Commitments creation and discovery", async () => {
  const [page, workspace, frame] = await Promise.all([
    source("src/app/trades/new/page.tsx"),
    source("src/components/create/collective-create-workspace.tsx"),
    source("src/components/create/create-interface-frame.tsx"),
  ]);

  assert.match(page, /mode === "collective"/);
  assert.match(page, /CollectiveCreateWorkspace/);
  assert.match(page, /CollectiveCreateSignInGate/);
  assert.match(workspace, /id="collective-commitment-form"/);
  assert.match(workspace, /id="collective-identity"/);
  assert.match(workspace, /id="collective-commitments-list"/);
  assert.match(frame, /data-request-kind="collective"/);
  assert.match(frame, />Collective commitment</);
  assert.match(frame, /window\.parent\.location\.assign\(target\)/);
  assert.match(frame, /repeat\(2, minmax\(0, 1fr\)\)/);
});

test("legacy standalone Collective Commitment entries redirect into Create", async () => {
  const [directory, newPage, identity, shell, controls] = await Promise.all([
    source("src/app/collective-commitments/page.tsx"),
    source("src/app/collective-commitments/new/page.tsx"),
    source("src/app/collective-commitments/identity/page.tsx"),
    source("src/components/collective-commitments/collective-commitment-shell.tsx"),
    source("src/components/collective-commitments/collective-signature-controls.tsx"),
  ]);

  assert.match(directory, /redirect\("\/trades\/new\?mode=collective#collective-commitments-list"\)/);
  assert.match(newPage, /redirect\("\/trades\/new\?mode=collective#collective-commitment-form"\)/);
  assert.match(identity, /redirect\("\/trades\/new\?mode=collective#collective-identity"\)/);
  assert.match(shell, /href="\/trades\/new\?mode=collective#collective-commitments-list"/);
  assert.match(shell, /href="\/trades\/new\?mode=collective#collective-identity"/);
  assert.match(controls, /href="\/trades\/new\?mode=collective#collective-identity"/);
});

test("individual exact-terms records retain a dedicated shareable route", async () => {
  const [detailPage, workspace] = await Promise.all([
    source("src/app/collective-commitments/[commitmentId]/page.tsx"),
    source("src/components/create/collective-create-workspace.tsx"),
  ]);

  assert.match(detailPage, /getCollectiveCommitmentDetail/);
  assert.match(workspace, /href=\{`\/collective-commitments\/\$\{commitment\.id\}`\}/);
});

test("Collective expiry and encryption configuration remain fail-closed", async () => {
  const [env, vercel] = await Promise.all([
    source(".env.example"),
    source("vercel.json"),
  ]);
  assert.match(env, /COLLECTIVE_COMMITMENTS_ENABLED=false/);
  assert.match(env, /COLLECTIVE_COMMITMENT_MASTER_KEY=/);
  const parsed = JSON.parse(vercel) as { crons: Array<{ path: string; schedule: string }> };
  assert.ok(
    parsed.crons.some(
      (cron) =>
        cron.path === "/api/jobs/collective-commitments-expire" &&
        cron.schedule === "*/5 * * * *",
    ),
  );
});

test("the superseded duplicate-version migration is absent", async () => {
  const wiring = await source("src/collective-commitments-wiring.test.ts");
  assert.doesNotMatch(wiring, /20260727043000_fix_collective_manifest_materialized_rows\.sql/);
  assert.match(wiring, /20260727044500_fix_collective_manifest_typed_recordset\.sql/);
});
