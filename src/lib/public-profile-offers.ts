export const PUBLIC_PROFILE_OFFERS_PAGE_SIZE = 24;
export const OFFER_HYDRATION_CHUNK_SIZE = 100;

export function parsePublicProfileOfferPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function chunkForPostgrestIn<T>(
  items: readonly T[],
  chunkSize = OFFER_HYDRATION_CHUNK_SIZE,
): T[][] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("PostgREST chunk size must be a positive integer.");
  }

  const chunks: T[][] = [];
  for (let offset = 0; offset < items.length; offset += chunkSize) {
    chunks.push(items.slice(offset, offset + chunkSize));
  }
  return chunks;
}
