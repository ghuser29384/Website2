from __future__ import annotations

from pathlib import Path
import re
import subprocess

OLD_ROUTE = Path("src/app/api/connectors/every-org/[secret]/route.ts")
NEW_ROUTE = Path("src/app/api/connectors/every-org/[routeId]/route.ts")

SEARCH_PATTERN = (
    r"EVERY_ORG_WEBHOOK_PATH_SECRET|webhookPathSecret|candidatePathSecret|"
    r"canonicalPathSecret|path_ambiguous|path_mismatch|"
    r"api/connectors/every-org/\[secret\]"
)
TEMP_PREFIXES = (
    ".github/workflows/repair-every-org-webhook-route-id",
    ".github/workflows/run-every-org-webhook-route-id",
    ".github/scripts/apply-every-org-webhook-route-id",
)
ALLOWED_REFERENCES = {
    ".env.example",
    ".github/workflows/direct-donation-upgrade-gates.yml",
    ".github/workflows/direct-donation-upgrade-partial-gates.yml",
    ".github/workflows/direct-donation-upgrade-partial-qa.yml",
    ".github/workflows/direct-donation-upgrade-qa.yml",
    ".github/workflows/direct-donation-upgrade-rendered-qa.yml",
    "docs/direct-verified-donation-upgrade.md",
    "docs/every-org-pledge-donation-connector.md",
    "src/app/api/connectors/every-org/[secret]/route.ts",
    "src/lib/direct-donation-upgrade-source-contract.test.ts",
    "src/lib/direct-donation-upgrade.test.ts",
    "src/lib/direct-donation-upgrade.ts",
    "src/lib/every-org-partner-webhook-auth.test.ts",
    "src/lib/every-org-partner-webhook-auth.ts",
    "src/lib/trade-donation.test.ts",
    "src/lib/trade-donation.ts",
}
REQUIRED_REFERENCES = {
    ".env.example",
    "src/app/api/connectors/every-org/[secret]/route.ts",
    "src/lib/direct-donation-upgrade.ts",
    "src/lib/every-org-partner-webhook-auth.test.ts",
    "src/lib/every-org-partner-webhook-auth.ts",
    "src/lib/trade-donation.ts",
}


def run(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, check=check, capture_output=True, text=True)


def replace_exact(
    source: str,
    old: str,
    new: str,
    *,
    label: str,
    count: int = 1,
) -> str:
    actual = source.count(old)
    if actual != count:
        raise SystemExit(
            f"Refusing: expected {count} {label} anchor(s), found {actual}",
        )
    return source.replace(old, new, count)


def add_import(source: str, name: str, *, label: str) -> str:
    if name in source:
        return source
    anchor = "  getEveryOrgCredentialConfiguration,\n"
    if anchor not in source:
        raise SystemExit(f"Refusing: {label} import anchor missing")
    return source.replace(anchor, anchor + f"  {name},\n", 1)


if not OLD_ROUTE.exists() or NEW_ROUTE.exists():
    raise SystemExit("Refusing: expected only the historical [secret] connector route")

result = run("git", "grep", "-Il", "-E", SEARCH_PATTERN, "--", ".", check=False)
if result.returncode not in (0, 1):
    raise SystemExit(result.stderr)
references = {
    line.strip()
    for line in result.stdout.splitlines()
    if line.strip() and not line.strip().startswith(TEMP_PREFIXES)
}
unexpected = sorted(references - ALLOWED_REFERENCES)
if unexpected:
    raise SystemExit(f"Refusing unexpected route-secret references: {unexpected}")
missing = sorted(REQUIRED_REFERENCES - references)
if missing:
    raise SystemExit(f"Refusing: expected route-secret references missing: {missing}")

run("git", "mv", str(OLD_ROUTE.parent), str(NEW_ROUTE.parent))
paths = {str(NEW_ROUTE) if path == str(OLD_ROUTE) else path for path in references}

replacements = [
    ("EVERY_ORG_WEBHOOK_PATH_SECRET", "EVERY_ORG_WEBHOOK_ROUTE_ID"),
    ("webhookPathSecret", "webhookRouteId"),
    ("candidatePathSecret", "candidateRouteId"),
    ("canonicalPathSecret", "canonicalRouteId"),
    ("path_ambiguous", "route_id_ambiguous"),
    ("path_mismatch", "route_id_mismatch"),
    ("api/connectors/every-org/[secret]", "api/connectors/every-org/[routeId]"),
    ("pathSecret", "routeId"),
    (
        "phase-a-webhook-path-secret-that-is-long-enough",
        "phase-a-webhook-route-id-000000000001",
    ),
    (
        "another-phase-a-webhook-path-secret-that-is-long-enough",
        "another-phase-a-webhook-route-id-000001",
    ),
    ("webhook path secret", "webhook route ID"),
    ("Webhook path secret", "Webhook route ID"),
    ("webhook-path secret", "webhook route ID"),
    ("defense-in-depth path", "defense-in-depth route ID"),
    ("secret URL path", "opaque webhook route ID"),
    ("secret path", "route ID"),
    ("path-secret", "route-id"),
]
for path_text in sorted(paths):
    path = Path(path_text)
    source = path.read_text()
    for old, new in replacements:
        source = source.replace(old, new)
    path.write_text(source)

route_source = NEW_ROUTE.read_text()
route_source = replace_exact(
    route_source,
    "context: { params: Promise<{ secret: string }> },",
    "context: { params: Promise<{ routeId: string }> },",
    label="route parameter type",
)
route_source = replace_exact(
    route_source,
    "const { secret } = await context.params;",
    "const { routeId } = await context.params;",
    label="route parameter destructuring",
)
route_source = replace_exact(
    route_source,
    "resolveEveryOrgSharedConnector(secret, [",
    "resolveEveryOrgSharedConnector(routeId, [",
    label="route resolution call",
)
NEW_ROUTE.write_text(route_source)

auth_path = Path("src/lib/every-org-partner-webhook-auth.ts")
auth_source = auth_path.read_text()
validator = """export function isValidEveryOrgWebhookRouteId(value: string) {
  return /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

"""
anchor = "export function getEveryOrgCredentialConfiguration("
if anchor not in auth_source:
    raise SystemExit("Refusing: credential-configuration anchor missing")
if "isValidEveryOrgWebhookRouteId" not in auth_source:
    auth_source = auth_source.replace(anchor, validator + anchor, 1)

resolution_start_text = (
    '  const canonicalRouteId = enabled[0]?.webhookRouteId ?? "";'
)
resolution_start = auth_source.find(resolution_start_text)
if resolution_start < 0:
    raise SystemExit("Refusing: canonical route-ID block missing")
resolution_end_text = "\n\n  return {\n    accepted: true,"
resolution_end = auth_source.find(resolution_end_text, resolution_start)
if resolution_end < 0:
    raise SystemExit("Refusing: accepted-resolution anchor missing")
new_resolution = """  const canonicalRouteId = enabled[0]?.webhookRouteId ?? "";
  if (
    !isValidEveryOrgWebhookRouteId(canonicalRouteId) ||
    enabled.some(
      (mechanism) =>
        !isValidEveryOrgWebhookRouteId(mechanism.webhookRouteId) ||
        mechanism.webhookRouteId !== canonicalRouteId,
    )
  ) {
    return {
      accepted: false,
      status: "route_id_ambiguous",
      mechanisms: mechanismNames,
      environment: null,
    };
  }

  if (
    !isValidEveryOrgWebhookRouteId(candidateRouteId) ||
    candidateRouteId !== canonicalRouteId
  ) {
    return {
      accepted: false,
      status: "route_id_mismatch",
      mechanisms: mechanismNames,
      environment: null,
    };
  }"""
auth_source = (
    auth_source[:resolution_start]
    + new_resolution
    + auth_source[resolution_end:]
)
auth_path.write_text(auth_source)

for source_name in ["src/lib/direct-donation-upgrade.ts", "src/lib/trade-donation.ts"]:
    path = Path(source_name)
    source = add_import(
        path.read_text(),
        "isValidEveryOrgWebhookRouteId",
        label=source_name,
    )
    path.write_text(source)

direct_path = Path("src/lib/direct-donation-upgrade.ts")
direct = direct_path.read_text()
direct = replace_exact(
    direct,
    """  if (webhookRouteId.length < 32) {
    blockers.push("EVERY_ORG_WEBHOOK_ROUTE_ID must be at least 32 characters.");
  }""",
    """  if (!isValidEveryOrgWebhookRouteId(webhookRouteId)) {
    blockers.push(
      "EVERY_ORG_WEBHOOK_ROUTE_ID must be 32-128 URL-safe characters.",
    );
  }""",
    label="direct route-ID validation",
)
direct = replace_exact(
    direct,
    "    webhookRouteId.length >= 32 &&\n",
    "    isValidEveryOrgWebhookRouteId(webhookRouteId) &&\n",
    label="direct route-ID readiness",
)
direct_path.write_text(direct)

trade_path = Path("src/lib/trade-donation.ts")
trade = trade_path.read_text()
trade = replace_exact(
    trade,
    '  if (webhookRouteId.length < 32) blockers.push("Every.org webhook route ID must be at least 32 characters.");',
    """  if (!isValidEveryOrgWebhookRouteId(webhookRouteId)) {
    blockers.push(
      "Every.org webhook route ID must be 32-128 URL-safe characters.",
    );
  }""",
    label="pledge route-ID validation",
)
trade_path.write_text(trade)

env_path = Path(".env.example")
env_source = env_path.read_text()
env_anchor = "EVERY_ORG_WEBHOOK_ROUTE_ID=\n"
env_note = (
    "# Opaque routing identifier only; it is not a credential and may appear in provider\n"
    "# or hosting logs. Sender authentication uses the private Partner Webhook token.\n"
)
if env_anchor not in env_source:
    raise SystemExit("Refusing: route-ID environment anchor missing")
if env_note not in env_source:
    env_source = env_source.replace(env_anchor, env_anchor + env_note, 1)
env_path.write_text(env_source)

documentation_note = """
### Webhook route identifier

`EVERY_ORG_WEBHOOK_ROUTE_ID` is an opaque, URL-safe routing identifier, not a credential. Provider and hosting infrastructure may retain the request pathname. The route ID may narrow dispatch as defense in depth, but it is never sufficient sender authentication. Only the separately configured, private Partner Webhook authorization token may authenticate an inbound delivery after Every.org supplies the exact written header contract.
"""
for doc_name in [
    "docs/direct-verified-donation-upgrade.md",
    "docs/every-org-pledge-donation-connector.md",
]:
    doc = Path(doc_name)
    source = doc.read_text().rstrip() + "\n"
    if "### Webhook route identifier" not in source:
        source += "\n" + documentation_note.strip() + "\n"
    doc.write_text(source)

test_path = Path("src/lib/every-org-partner-webhook-auth.test.ts")
test_source = add_import(
    test_path.read_text(),
    "isValidEveryOrgWebhookRouteId",
    label="auth test",
)
test_source = replace_exact(
    test_source,
    "{ params: Promise.resolve({ secret: routeId }) },",
    "{ params: Promise.resolve({ routeId }) },",
    label="auth-test route params",
)
route_validation_test = """test("webhook route IDs are opaque non-secret routing values with a closed URL-safe grammar", () => {
  assert.equal(isValidEveryOrgWebhookRouteId(routeId), true);
  assert.equal(
    isValidEveryOrgWebhookRouteId("another-phase-a-webhook-route-id-000001"),
    true,
  );
  assert.equal(isValidEveryOrgWebhookRouteId("too-short"), false);
  assert.equal(
    isValidEveryOrgWebhookRouteId("route-id-with-a-slash/0000000000000000"),
    false,
  );
  assert.equal(
    isValidEveryOrgWebhookRouteId("route id with spaces 000000000000000000"),
    false,
  );
});

"""
insertion_anchor = (
    'test("the shared connector accepts its defense-in-depth route ID only for one compatible ready configuration", () => {'
)
if insertion_anchor not in test_source:
    raise SystemExit("Refusing: auth-test insertion anchor missing")
if "webhook route IDs are opaque non-secret routing values" not in test_source:
    test_source = test_source.replace(
        insertion_anchor,
        route_validation_test + insertion_anchor,
        1,
    )
test_path.write_text(test_source)

source_contract = Path(
    "src/lib/every-org-webhook-route-id-source-contract.test.ts",
)
if source_contract.exists():
    raise SystemExit("Refusing: route-ID source contract already exists")
source_contract.write_text(
    r'''import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const routePath = "src/app/api/connectors/every-org/[routeId]/route.ts";
const oldRoutePath = "src/app/api/connectors/every-org/[secret]/route.ts";

test("Every.org webhook routing is explicitly non-secret and sender authentication remains first", () => {
  assert.equal(existsSync(routePath), true);
  assert.equal(existsSync(oldRoutePath), false);

  const route = readFileSync(routePath, "utf8");
  const environment = readFileSync(".env.example", "utf8");
  const auth = route.indexOf("authenticateEveryOrgPartnerWebhookRequest()");
  const params = route.indexOf("await context.params");
  const body = route.indexOf("await request.text()");
  const database = route.indexOf("createServiceClient()");

  assert.ok(auth >= 0);
  assert.ok(params > auth);
  assert.ok(body > params);
  assert.ok(database > body);
  assert.match(route, /params: Promise<\{ routeId: string \}>/);
  assert.match(route, /resolveEveryOrgSharedConnector\(routeId,/);
  assert.doesNotMatch(route, /WEBHOOK_PATH_SECRET|webhookPathSecret/);

  assert.match(environment, /EVERY_ORG_WEBHOOK_ROUTE_ID=/);
  assert.match(environment, /not a credential and may appear in provider/);
  assert.match(
    environment,
    /Sender authentication uses the private Partner Webhook token/,
  );
  assert.doesNotMatch(environment, /EVERY_ORG_WEBHOOK_PATH_SECRET=/);
});
''',
)

tracked = run("git", "ls-files").stdout.splitlines()
stale_pattern = re.compile(SEARCH_PATTERN)
stale: list[str] = []
for path_text in tracked:
    if path_text.startswith(TEMP_PREFIXES) or path_text == "route-id-hardening-failure.json":
        continue
    path = Path(path_text)
    try:
        source = path.read_text()
    except (UnicodeDecodeError, OSError):
        continue
    if stale_pattern.search(source):
        stale.append(path_text)
if stale:
    raise SystemExit(f"Refusing: stale secret-path semantics remain: {stale}")
