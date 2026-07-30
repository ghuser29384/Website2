import { GENERIC_CREATE_NO_TRADE_BASELINE } from "@/lib/trade-safeguards";

import type { ValidatedCreatePayload } from "./types";
import { validateCreatePayload } from "./validation";

export type CreateAffectedPartyStatus =
  | "none_identified"
  | "review_required";

export interface CreateSafeguards {
  affectedPartyPlan: string;
  affectedPartyStatus: CreateAffectedPartyStatus;
  baselineConfirmed: true;
  capacity: "individual";
  noManufacturedLeverage: true;
  noTradeBaseline: string;
}

export type ValidatedCreatePayloadWithSafeguards = Omit<
  ValidatedCreatePayload,
  "source"
> & {
  safeguards: CreateSafeguards;
  source: ValidatedCreatePayload["source"] & {
    safeguards: CreateSafeguards;
  };
};

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function textValue(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length < minimum) {
    throw new Error(`${label} must be at least ${minimum} characters.`);
  }
  if (text.length > maximum) {
    throw new Error(`${label} must be ${maximum} characters or fewer.`);
  }
  return text;
}

function optionalText(value: unknown, maximum: number) {
  if (value == null || value === "") return "";
  return textValue(value, "Affected-party plan", 0, maximum);
}

export function validateCreateSafeguards(raw: unknown): CreateSafeguards {
  const input = objectValue(raw, "Create safeguards");
  const allowedFields = new Set([
    "affectedPartyPlan",
    "affectedPartyStatus",
    "baselineConfirmed",
    "capacity",
    "noManufacturedLeverage",
    "noTradeBaseline",
  ]);

  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      throw new Error(`Create safeguards contain an unsupported field: ${key}.`);
    }
  }

  const noTradeBaseline = textValue(
    input.noTradeBaseline,
    "No-trade baseline",
    20,
    600,
  );
  if (
    noTradeBaseline.toLowerCase() ===
    GENERIC_CREATE_NO_TRADE_BASELINE.toLowerCase()
  ) {
    throw new Error(
      "No-trade baseline must describe the specific default, not only the absence of an agreement.",
    );
  }
  if (input.baselineConfirmed !== true) {
    throw new Error("Confirm that the no-trade baseline is genuine.");
  }
  if (input.noManufacturedLeverage !== true) {
    throw new Error(
      "Confirm that no harm or costly baseline was manufactured or escalated for leverage.",
    );
  }

  const affectedPartyStatus = input.affectedPartyStatus;
  if (
    affectedPartyStatus !== "none_identified" &&
    affectedPartyStatus !== "review_required"
  ) {
    throw new Error("Affected-party status is invalid.");
  }
  const affectedPartyPlan = optionalText(input.affectedPartyPlan, 600);
  if (
    affectedPartyStatus === "review_required" &&
    affectedPartyPlan.length < 20
  ) {
    throw new Error(
      "A possible affected party requires an impact, standing, and remedy plan of at least 20 characters.",
    );
  }
  if (affectedPartyStatus === "none_identified" && affectedPartyPlan) {
    throw new Error(
      "Affected-party plan must be empty when no affected nonparticipant is identified.",
    );
  }

  if (input.capacity !== "individual") {
    throw new Error(
      "The current Create flow accepts individual capacity only and cannot authorize organizational representation.",
    );
  }

  return {
    affectedPartyPlan,
    affectedPartyStatus,
    baselineConfirmed: true,
    capacity: "individual",
    noManufacturedLeverage: true,
    noTradeBaseline,
  };
}

export function validateCreatePayloadWithSafeguards(
  raw: unknown,
): ValidatedCreatePayloadWithSafeguards {
  const input = objectValue(raw, "Create submission");
  const base = validateCreatePayload(raw);
  const safeguards = validateCreateSafeguards(input.safeguards);

  return {
    ...base,
    safeguards,
    source: {
      ...base.source,
      safeguards,
    },
  };
}
