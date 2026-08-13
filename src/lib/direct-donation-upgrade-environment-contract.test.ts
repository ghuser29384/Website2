import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  directDonationUpgradeRenderedQaNoServiceDataEnabled,
  DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID,
} from "@/lib/direct-donation-upgrade-data";

const dataSource = readFileSync(
  "src/lib/direct-donation-upgrade-data.ts",
  "utf8",
);
const webhookSource = readFileSync(
  "src/lib/direct-donation-upgrade-webhook.ts",
  "utf8",
);
const createSource = readFileSync(
  "src/app/trades/new/direct-donation-upgrade-create.tsx",
  "utf8",
);

const QA_ENVIRONMENT_KEYS = [
  "DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE",
  "DIRECT_DONATION_UPGRADE_QA_FIXTURES",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_TARGET_ENV",
] as const;
const REQUIRED_QA_ENVIRONMENT_KEYS = QA_ENVIRONMENT_KEYS.filter(
  (name) => name !== "VERCEL_TARGET_ENV",
);

function withQaEnvironment(
  values: Partial<Record<(typeof QA_ENVIRONMENT_KEYS)[number], string>>,
  callback: () => void,
) {
  const prior = Object.fromEntries(
    QA_ENVIRONMENT_KEYS.map((name) => [name, process.env[name]]),
  );
  try {
    for (const name of QA_ENVIRONMENT_KEYS) delete process.env[name];
    Object.assign(process.env, values);
    callback();
  } finally {
    for (const name of QA_ENVIRONMENT_KEYS) {
      const value = prior[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("the rendered-QA service-data bypass requires every allowlisted condition", () => {
  const exact = {
    DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE: "true",
    DIRECT_DONATION_UPGRADE_QA_FIXTURES: "true",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_TARGET_ENV: "preview",
  };

  withQaEnvironment(exact, () => {
    assert.equal(
      directDonationUpgradeRenderedQaNoServiceDataEnabled({
        viewerId: DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID,
        environment: "staging",
      }),
      true,
    );
    assert.equal(
      directDonationUpgradeRenderedQaNoServiceDataEnabled({
        viewerId: "d1000000-0000-4000-8000-000000000099",
        environment: "staging",
      }),
      false,
    );
    assert.equal(
      directDonationUpgradeRenderedQaNoServiceDataEnabled({
        viewerId: DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID,
        environment: "live",
      }),
      false,
    );
  });

  for (const missing of REQUIRED_QA_ENVIRONMENT_KEYS) {
    withQaEnvironment({ ...exact, [missing]: "" }, () => {
      assert.equal(
        directDonationUpgradeRenderedQaNoServiceDataEnabled({
          viewerId: DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID,
          environment: "staging",
        }),
        false,
        missing,
      );
    });
  }

  withQaEnvironment({ ...exact, VERCEL_TARGET_ENV: "production" }, () => {
    assert.equal(
      directDonationUpgradeRenderedQaNoServiceDataEnabled({
        viewerId: DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID,
        environment: "staging",
      }),
      false,
    );
  });
});

test("viewer candidates and proposals are inner-scoped through their offer environment", () => {
  assert.equal(
    dataSource.match(
      /offer_scope:direct_donation_upgrade_offers!offer_id!inner\(\)/g,
    )?.length,
    2,
  );
  assert.equal(
    dataSource.match(/\.eq\("offer_scope\.environment", input\.environment\)/g)
      ?.length,
    2,
  );
});

test("only active or fulfilled matcher commitments grant participant-private detail", () => {
  assert.match(
    dataSource,
    /\.eq\("profile_id", input\.viewerId\)[\s\S]*?\.in\("status", \["primary", "backup", "promoted", "fulfilled"\]\)[\s\S]*?\.maybeSingle\(\)/,
  );
});

test("webhook obligation ownership and the no-service page bypass are environment-scoped", () => {
  assert.match(
    webhookSource,
    /\.eq\("environment", input\.config\.environment\)/,
  );
  assert.match(
    createSource,
    /directDonationUpgradeRenderedQaNoServiceDataEnabled\(\{/,
  );
  assert.doesNotMatch(
    createSource,
    /process\.env\.DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE/,
  );
});
