export function getFormMessage(
  searchParams:
    | Record<string, string | string[] | undefined>
    | URLSearchParams
    | null
    | undefined,
) {
  if (!searchParams) {
    return null;
  }

  const decodeText = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const read = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key);
    }

    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value ?? null;
  };

  const error = read("error");
  if (error) {
    return { tone: "error" as const, text: decodeText(error) };
  }

  const message = read("message");
  if (message) {
    return { tone: "success" as const, text: decodeText(message) };
  }

  return null;
}
