const POSTGRES_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true when a value is safe to pass to a PostgreSQL uuid parameter.
 *
 * PostgreSQL accepts UUID text independently of RFC version/variant bits, so
 * this deliberately validates the canonical hexadecimal shape rather than a
 * narrower version-specific subset.
 */
export function isPostgresUuid(value: string) {
  return POSTGRES_UUID_PATTERN.test(value);
}
