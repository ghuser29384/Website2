import { spawnSync } from "node:child_process";

const checks = [
  {
    command: process.execPath,
    args: [
      "--test",
      "--import",
      "tsx",
      "src/lib/trade-reminders.test.ts",
      "src/lib/trade-reminder-worker.test.ts",
      "src/lib/trade-reminder-email-safety.test.ts",
    ],
  },
  {
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: [
      "eslint",
      "src/app/agreements/[agreementId]/reminders/page.tsx",
      "src/app/agreements/[agreementId]/template.tsx",
      "src/app/api/calendar/reminders/[...token]/route.ts",
      "src/app/api/jobs/trade-reminders/route.ts",
      "src/app/commitments/[agreementId]/reminders/page.tsx",
      "src/app/commitments/page.tsx",
      "src/app/trade-agreements/[agreementId]/reminders/actions.ts",
      "src/app/trade-agreements/[agreementId]/reminders/page.tsx",
      "src/app/trade-agreements/[agreementId]/template.tsx",
      "src/components/core-trade/reminder-launcher.tsx",
      "src/components/core-trade/reminder-management.tsx",
      "src/lib/trade-reminder-email-safety.test.ts",
      "src/lib/trade-reminder-worker.test.ts",
      "src/lib/trade-reminder-worker.ts",
      "src/lib/trade-reminders.test.ts",
      "src/lib/trade-reminders.ts",
    ],
  },
];

for (const check of checks) {
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
