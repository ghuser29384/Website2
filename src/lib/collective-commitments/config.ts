const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export function isCollectiveCommitmentsEnabled() {
  return ENABLED_VALUES.has(String(process.env.COLLECTIVE_COMMITMENTS_ENABLED ?? "").toLowerCase());
}

export function getCollectiveCommitmentMinimumDeadlineMinutes() {
  const parsed = Number.parseInt(
    String(process.env.COLLECTIVE_COMMITMENT_MIN_DEADLINE_MINUTES ?? "60"),
    10,
  );

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 43_200) {
    return 60;
  }

  return parsed;
}

export function getCollectiveCommitmentMasterKey() {
  const encoded = String(process.env.COLLECTIVE_COMMITMENT_MASTER_KEY ?? "").trim();
  if (!encoded) {
    throw new Error("Missing COLLECTIVE_COMMITMENT_MASTER_KEY.");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("COLLECTIVE_COMMITMENT_MASTER_KEY must decode to exactly 32 bytes.");
  }

  return key;
}

export function assertCollectiveCommitmentsReady() {
  if (!isCollectiveCommitmentsEnabled()) {
    throw new Error("Collective commitments are disabled in this environment.");
  }

  getCollectiveCommitmentMasterKey();
}
