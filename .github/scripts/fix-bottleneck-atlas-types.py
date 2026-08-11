from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"expected marker not found in {path}: {old[:120]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"expected exactly one marker in {path}, found {text.count(old)}")
    path.write_text(text.replace(old, new, 1))


synthesis = Path("src/lib/opportunity-synthesis.ts")
replace_once(
    synthesis,
    '''export function isOpportunitySynthesisEnabled(
  environment: Pick<NodeJS.ProcessEnv, "OPPORTUNITY_SYNTHESIS_ENABLED"> = process.env,
) {
''',
    '''export function isOpportunitySynthesisEnabled(
  environment: Record<string, string | undefined> = process.env,
) {
''',
)
replace_once(
    synthesis,
    '''export function mergeExistingAndSynthesizedRecommendations<T extends { id: string }>(
  existing: readonly T[],
  synthesized: readonly T[],
  limit = 12,
) {
  const maximum = Math.max(0, Math.min(24, limit));
  if (!maximum) return [] as T[];
''',
    '''export function mergeExistingAndSynthesizedRecommendations<
  Existing extends { id: string },
  Synthesized extends { id: string },
>(
  existing: readonly Existing[],
  synthesized: readonly Synthesized[],
  limit = 12,
): Array<Existing | Synthesized> {
  const maximum = Math.max(0, Math.min(24, limit));
  if (!maximum) return [];
''',
)
replace_once(
    synthesis,
    '''  const selected: T[] = [];
  const seen = new Set<string>();
  const add = (item: T | undefined) => {
''',
    '''  const selected: Array<Existing | Synthesized> = [];
  const seen = new Set<string>();
  const add = (item: Existing | Synthesized | undefined) => {
''',
)

atlas_test = Path("src/lib/bottleneck-atlas.test.ts")
replace_once(
    atlas_test,
    '''test("the atlas contains individual as well as institutional synthesis paths", () => {
  assert.ok(
    OPPORTUNITY_SYNTHESIS_TEMPLATES.some((template) => template.actorScopes.includes("individual")),
  );
  assert.ok(
    OPPORTUNITY_SYNTHESIS_TEMPLATES.some((template) => template.actorScopes.includes("organization")),
  );
  assert.ok(
    OPPORTUNITY_SYNTHESIS_TEMPLATES.some((template) => template.actorScopes.includes("coalition")),
  );
});
''',
    '''test("the atlas contains individual as well as institutional synthesis paths", () => {
  const actorScopes = new Set<string>(
    OPPORTUNITY_SYNTHESIS_TEMPLATES.flatMap((template) => [...template.actorScopes]),
  );
  assert.equal(actorScopes.has("individual"), true);
  assert.equal(actorScopes.has("organization"), true);
  assert.equal(actorScopes.has("coalition"), true);
});
''',
)
