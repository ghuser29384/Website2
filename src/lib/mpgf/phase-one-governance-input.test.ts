import assert from "node:assert/strict";
import test from "node:test";

import {
  asMpgfPhaseOneRecord,
  parseMpgfPhaseOneAmountCents,
  parseMpgfPhaseOneIdempotencyKey,
  parseMpgfPhaseOneProjectIds,
  parseMpgfPhaseOneResultHash,
  parseMpgfPhaseOneUuid,
} from "./phase-one-governance-input";

const firstUuid = "6b2aab92-f4b3-4b03-9b7f-cf62f9ec1188";
const secondUuid = "7852dc2c-c95e-4fea-9496-7ba96b4470b9";

test("phase-one input parsing accepts bounded canonical mutation fields", () => {
  assert.deepEqual(asMpgfPhaseOneRecord({ roundId: firstUuid }), {
    roundId: firstUuid,
  });
  assert.equal(parseMpgfPhaseOneUuid(firstUuid, "Round ID"), firstUuid);
  assert.equal(parseMpgfPhaseOneAmountCents(2_500), 2_500);
  assert.equal(
    parseMpgfPhaseOneIdempotencyKey("mpgf.phase-one.test.1234"),
    "mpgf.phase-one.test.1234",
  );
  assert.deepEqual(parseMpgfPhaseOneProjectIds([firstUuid, secondUuid]), [
    firstUuid,
    secondUuid,
  ]);
  assert.equal(
    parseMpgfPhaseOneResultHash("ab".repeat(32)),
    "ab".repeat(32),
  );
});

test("phase-one input parsing rejects unsafe amounts and ambiguous ballots", () => {
  assert.throws(() => parseMpgfPhaseOneAmountCents(0), /positive safe integer/);
  assert.throws(
    () => parseMpgfPhaseOneAmountCents(Number.MAX_SAFE_INTEGER + 1),
    /positive safe integer/,
  );
  assert.throws(
    () => parseMpgfPhaseOneProjectIds([firstUuid, firstUuid]),
    /must be unique/,
  );
  assert.throws(() => parseMpgfPhaseOneProjectIds([]), /between 1 and 50/);
  assert.throws(
    () => parseMpgfPhaseOneIdempotencyKey("short"),
    /12-160 character/,
  );
  assert.throws(
    () => parseMpgfPhaseOneResultHash("not-a-hash"),
    /result hash is invalid/,
  );
});
