import { getCommandCapability } from "@/lib/command/capabilities";

function compact(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 80);
}

export function confirmationPhraseForTool(
  capabilityKey: string,
  argumentsValue: Record<string, unknown>,
) {
  const capability = getCommandCapability(capabilityKey);
  if (!capability || capability.confirmationLevel !== "type_exact_phrase") return null;
  const amount =
    argumentsValue.amount ??
    argumentsValue.contributionAmount ??
    argumentsValue.maximumAmount ??
    "EXACT AMOUNT";
  const currency = compact(argumentsValue.currency ?? "USD") || "USD";
  return `CONFIRM ${compact(capabilityKey.replaceAll("_", " "))} ${compact(amount)} ${currency}`;
}

export function confirmationMatches({
  capabilityKey,
  argumentsValue,
  confirmation,
}: {
  capabilityKey: string;
  argumentsValue: Record<string, unknown>;
  confirmation: string;
}) {
  const capability = getCommandCapability(capabilityKey);
  if (!capability) return false;
  if (capability.confirmationLevel === "none") return true;
  if (capability.confirmationLevel === "acknowledge") {
    return confirmation.trim().toLowerCase() === "acknowledge";
  }
  if (capability.confirmationLevel === "confirm") {
    return confirmation.trim().toLowerCase() === "confirm";
  }
  return confirmation.trim() === confirmationPhraseForTool(capabilityKey, argumentsValue);
}
