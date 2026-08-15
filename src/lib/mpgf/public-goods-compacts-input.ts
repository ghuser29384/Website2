import {
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
  type MpgfPublicGoodsCompactAcknowledgements,
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

export function parseMpgfPublicGoodsCompactAcknowledgements(
  value: unknown,
): MpgfPublicGoodsCompactAcknowledgements {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Complete every required compact acknowledgement.");
  }
  const record = value as Record<string, unknown>;
  const requiredKeys = Object.keys(MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS);
  if (
    Object.keys(record).length !== requiredKeys.length ||
    requiredKeys.some((key) => record[key] !== true)
  ) {
    throw new Error("Complete every required compact acknowledgement.");
  }
  return MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS;
}

export function parseMpgfPublicGoodsCompactAllocationBps(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Submit a complete Compact allocation map.");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    throw new Error("Submit a complete Compact allocation map.");
  }
  const parsed: Record<string, number> = {};
  let total = 0;
  for (const [key, amount] of Object.entries(record)) {
    if (!compactPublicKeys.has(key) || !Number.isInteger(amount) || (amount as number) < 0 || (amount as number) > 10_000) {
      throw new Error("Each published Compact allocation must be an integer from 0 through 10000 basis points.");
    }
    parsed[key] = amount as number;
    total += amount as number;
  }
  if (total !== 10_000) {
    throw new Error("Compact allocations must total exactly 10000 basis points.");
  }
  return parsed;
}

export function parseMpgfPublicGoodsCompactIdempotencyKey(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$/.test(value)) {
    throw new Error("A valid compact idempotency key is required.");
  }
  return value;
}

export function parseMpgfPublicGoodsCompactCycleKey(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)) {
    throw new Error("A valid frozen Compact cycle key is required.");
  }
  return value;
}

export function parseMpgfPublicGoodsCompactMembershipId(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("A valid funding-qualified Compact membership ID is required.");
  }
  return value;
}
