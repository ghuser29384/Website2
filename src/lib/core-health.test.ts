import assert from "node:assert/strict";
import test from "node:test";

import { deriveCoreHealthStatus, type CoreHealthChecks } from "./core-health";

const READY: CoreHealthChecks = {
  authAvailable: true,
  databaseAvailable: true,
  encryptionConfigured: true,
  privilegedClientConfigured: true,
  requiredDatabaseContractReady: true,
  storageAvailable: true,
  supabasePublicConfigAvailable: true,
};

test("returns ok only when every required launch dependency is ready", () => {
  assert.equal(deriveCoreHealthStatus(READY), "ok");
});

test("returns degraded when a privileged or supporting dependency is missing", () => {
  assert.equal(
    deriveCoreHealthStatus({ ...READY, encryptionConfigured: false }),
    "degraded",
  );
  assert.equal(
    deriveCoreHealthStatus({ ...READY, storageAvailable: false }),
    "degraded",
  );
  assert.equal(
    deriveCoreHealthStatus({ ...READY, requiredDatabaseContractReady: false }),
    "degraded",
  );
});

test("returns unavailable when the public configuration or database is unavailable", () => {
  assert.equal(
    deriveCoreHealthStatus({ ...READY, supabasePublicConfigAvailable: false }),
    "unavailable",
  );
  assert.equal(
    deriveCoreHealthStatus({ ...READY, databaseAvailable: false }),
    "unavailable",
  );
});
