/** System copy is currently English. Never infer its language from browser locale.
 * Locale controls presentation only; timestamps still use the visitor's time zone.
 * Keep explicit caller locales supported for a future translated interface.
 */
export const INTERFACE_LOCALE = "en-US";
