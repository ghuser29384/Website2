export interface DisplayNameParts {
  firstName: string | null;
  initials: string | null;
}

function getFirstCharacter(value: string) {
  return Array.from(value)[0] ?? "";
}

export function getDisplayNameParts(
  displayName: string | null | undefined,
): DisplayNameParts {
  const normalizedName = displayName?.trim().replace(/\s+/g, " ") ?? "";

  if (!normalizedName) {
    return {
      firstName: null,
      initials: null,
    };
  }

  const nameParts = normalizedName.split(" ");
  const initialParts =
    nameParts.length === 1 ? nameParts : [nameParts[0], nameParts[nameParts.length - 1]];
  const initials = initialParts
    .map((part) => getFirstCharacter(part).toUpperCase())
    .join("")
    .slice(0, 2);

  return {
    firstName: nameParts[0],
    initials: initials || null,
  };
}
