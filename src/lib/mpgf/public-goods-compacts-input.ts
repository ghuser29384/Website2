import {
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_MAX_DECLARED_SPENDING_CENTS,
  MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
} from "./public-goods-compacts";

const compactPublicKeys = new Set<string>(
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.map((charter) => charter.publicKey),
);

export function asMpgfPublicGoodsCompactRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The compact request must be a JSON object.");
  }

  return value as Record<string, unknown>;
}

export function parseMpgfPublicGoodsCompactPublicKey(value: unknown) {
  if (typeof value !== "string" || !compactPublicKeys.has(value)) {
    throw new Error("Choose a published public-goods compact.");
  }

  return value;
}

export function parseMpgfPublicGoodsCompactConstitutionVersion(value: unknown) {
  if (value !== MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION) {
    throw new Error("Accept the exact current compact constitution version.");
  }

  return value;
}

export function parseMpgfPublicGoodsCompactSpendingCents(value: unknown) {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 0 ||
    (value as number) > MPGF_PUBLIC_GOODS_COMPACT_MAX_DECLARED_SPENDING_CENTS
  ) {
    throw new Error(
      "Declared eligible monthly spending must be a non-negative whole number of cents.",
    );
  }

  return value as number;
}

export function parseMpgfPublicGoodsCompactIdempotencyKey(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$/.test(value)
  ) {
    throw new Error("A valid compact idempotency key is required.");
  }

  return value;
}

export function parseMpgfPublicGoodsCompactElectorateKey(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 160 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]+$/.test(value)
  ) {
    throw new Error("A valid active compact electorate key is required.");
  }

  return value;
}

export function parseMpgfPublicGoodsCompactMembershipId(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("A valid active compact membership ID is required.");
  }

  return value;
}
