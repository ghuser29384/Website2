import assert from "node:assert/strict";
import test from "node:test";

import { getDonationUpgradeDestinationEnvironment } from "@/lib/payments/donation-upgrade-destination-environment";

test("destination review follows the deployment rather than payment-mode activation", () => {
  assert.equal(
    getDonationUpgradeDestinationEnvironment({
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://preview.example",
    }),
    "live",
  );
  assert.equal(
    getDonationUpgradeDestinationEnvironment({
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_SITE_URL: "https://www.moraltrade.org",
    }),
    "test",
  );
  assert.equal(
    getDonationUpgradeDestinationEnvironment({
      NEXT_PUBLIC_SITE_URL: "https://www.moraltrade.org",
    }),
    "live",
  );
  assert.equal(
    getDonationUpgradeDestinationEnvironment({
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    }),
    "test",
  );
});
