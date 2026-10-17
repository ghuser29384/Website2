const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{12,160}$/;

export function asMpgfPhaseOneRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("MPGF phase-one requests expect a JSON object.");
  }

  return value as Record<string, unknown>;
}

export function parseMpgfPhaseOneUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value.trim())) {
    throw new Error(`${label} must be a UUID.`);
  }

  return value.trim();
}

export function parseMpgfPhaseOneIdempotencyKey(value: unknown) {
  if (
    typeof value !== "string" ||
    !IDEMPOTENCY_KEY_PATTERN.test(value.trim())
  ) {
    throw new Error(
      "MPGF phase-one mutation requires a 12-160 character scoped idempotency key.",
    );
  }

  return value.trim();
}

export function parseMpgfPhaseOneAmountCents(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error("Amount must be a positive safe integer number of cents.");
  }

  return Number(value);
}

export function parseMpgfPhaseOneProjectIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new Error("Select between 1 and 50 approved MPGF projects.");
  }

  const projectIds = value.map((projectId) =>
    parseMpgfPhaseOneUuid(projectId, "Project ID"),
  );

  if (new Set(projectIds).size !== projectIds.length) {
    throw new Error("MPGF ballot project selections must be unique.");
  }

  return projectIds;
}

export function parseMpgfPhaseOneResultHash(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{64}$/i.test(value.trim())
  ) {
    throw new Error("Published MPGF result hash is invalid.");
  }

  return value.trim().toLowerCase();
}
