from pathlib import Path
from textwrap import dedent

client_path = Path("src/lib/create-interface/group-contribution-client.ts")
client = client_path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global client
    count = client.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label}; found {count}")
    client = client.replace(old, new, 1)


replace_once(
    'import { sanitizeGroupContributionDraft } from "./group-contribution-draft-sanitize";\n',
    'import { sanitizeGroupContributionDraft } from "./group-contribution-draft-sanitize";\n'
    'import { parseGroupContributionProposalPayload } from "./group-contribution-payload";\n',
    "resume parser import",
)
replace_once(
    'const STORAGE_KEY = "mt:create:group-contribution-drafts:v1";\n'
    'const PAYLOAD_FIELD = "groupContributionTerms";',
    'const STORAGE_KEY = "mt:create:group-contribution-drafts:v1";\n'
    'const RESUME_STORAGE_KEY = "mt:create:group-contribution-resume:v1";\n'
    'const PAYLOAD_FIELD = "groupContributionTerms";',
    "resume storage key",
)
replace_once(
    'let scanQueued = false;\nlet submitGuardInstalled = false;',
    'let scanQueued = false;\n'
    'let submitGuardInstalled = false;\n'
    'let resumedProposal: GroupContributionProposalPayload | null = null;',
    "resume state declaration",
)
replace_once(
    '  activeWindow = targetWindow;\n'
    '  activeDocument = targetDocument;\n'
    '  scanQueued = false;',
    '  activeWindow = targetWindow;\n'
    '  activeDocument = targetDocument;\n'
    '  resumedProposal = readStoredResumeProposal();\n'
    '  scanQueued = false;',
    "resume activation",
)
replace_once(
    '  const root = locateOfferStepRoot();\n'
    '  if (!root) return;\n\n'
    '  const candidates = locateOptionCards(root);',
    '  const root = locateOfferStepRoot();\n'
    '  if (!root) {\n'
    '    if (resumedProposal) writeProposalPayload(false);\n'
    '    return;\n'
    '  }\n\n'
    '  const candidates = locateOptionCards(root);',
    "summary-screen proposal restoration",
)

change_start = client.find('  entry.shadow.addEventListener("change", (event) => {')
change_end = client.find('\n}\n\nfunction elementTarget', change_start)
if change_start < 0 or change_end < 0:
    raise SystemExit("Could not isolate the delegated change listener")
change_block = client[change_start:change_end]
old_change_tail = (
    '    persistDrafts();\n'
    '    writeProposalPayload();\n'
    '    scheduleMountedOptionRender(entry);\n'
    '  });'
)
new_change_tail = (
    '    persistDrafts();\n'
    '    writeProposalPayload();\n'
    '    if (controlRequiresPanelRender(control)) {\n'
    '      scheduleMountedOptionRender(entry);\n'
    '    } else {\n'
    '      updateValidationStatus(entry);\n'
    '    }\n'
    '  });'
)
if change_block.count(old_change_tail) != 1:
    raise SystemExit(
        "Expected one unconditional rerender tail in the delegated change listener"
    )
change_block = change_block.replace(old_change_tail, new_change_tail, 1)
client = client[:change_start] + change_block + client[change_end:]

control_anchor = 'function updateStateFromControl(\n'
control_helper = dedent('''\
function controlRequiresPanelRender(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): boolean {
  const field = control.dataset.field;
  return (
    field === "coActStructure" ||
    field === "activationMode" ||
    field === "performanceStartMode" ||
    field === "redistributionEnabled" ||
    field === "allocationMode" ||
    field === "recurringMode" ||
    field === "coFundDeadlineOutcome"
  );
}

function updateStateFromControl(
''')
if client.count(control_anchor) != 1:
    raise SystemExit(
        f"Expected one structural-control insertion point; found {client.count(control_anchor)}"
    )
client = client.replace(control_anchor, control_helper, 1)

replace_once(
    'function readProposalPayload(): GroupContributionProposalPayload {\n'
    '  const options: ProposalOptionPayload[] = [];',
    'function readProposalPayload(): GroupContributionProposalPayload {\n'
    '  if (mounted.size === 0 && resumedProposal) return resumedProposal;\n\n'
    '  const options: ProposalOptionPayload[] = [];',
    "resumed proposal fallback",
)
replace_once(
    'function writeProposalPayload(): void {\n'
    '  persistDrafts();',
    'function writeProposalPayload(persistCurrentDrafts = true): void {\n'
    '  if (persistCurrentDrafts) persistDrafts();',
    "conditional draft persistence",
)
replace_once(
    '    return originalFetch(input, {\n'
    '      ...init,\n'
    '      body: JSON.stringify({ ...payload, groupContributionTerms: proposal }),\n'
    '    });',
    '    persistResumeProposal(proposal);\n'
    '    const response = await originalFetch(input, {\n'
    '      ...init,\n'
    '      body: JSON.stringify({ ...payload, groupContributionTerms: proposal }),\n'
    '    });\n'
    '    if (response.ok) clearResumeProposal();\n'
    '    return response;',
    "publish resume lifecycle",
)

persist_anchor = 'function persistDrafts(): void {\n'
resume_helpers = dedent('''\
function isResumeRequest(): boolean {
  try {
    return new URL(window.location.href).searchParams.get("resume") === "create";
  } catch {
    return false;
  }
}

function persistResumeProposal(proposal: GroupContributionProposalPayload): void {
  if (proposal.options.length === 0) return;
  try {
    window.sessionStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(proposal));
    resumedProposal = proposal;
  } catch {
    // Authentication resume is best effort; the server remains authoritative.
  }
}

function clearResumeProposal(): void {
  resumedProposal = null;
  try {
    window.sessionStorage.removeItem(RESUME_STORAGE_KEY);
  } catch {
    // A successful server receipt is authoritative even if local cleanup fails.
  }
}

function readStoredResumeProposal(): GroupContributionProposalPayload | null {
  if (!isResumeRequest()) return null;
  try {
    const raw = window.sessionStorage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.options)) return null;

    const contributionKinds = new Map<string, UnderlyingContributionKind>();
    for (const candidate of parsed.options) {
      if (
        !isRecord(candidate) ||
        typeof candidate.optionKey !== "string" ||
        !isRecord(candidate.terms)
      ) {
        return null;
      }
      if (candidate.terms.mode === "co-act") {
        if (!permitsGroupContributionMode(PROPOSAL_FLAGS, "co-act")) return null;
        contributionKinds.set(candidate.optionKey, "nonfinancial");
      } else if (candidate.terms.mode === "co-fund") {
        if (!permitsGroupContributionMode(PROPOSAL_FLAGS, "co-fund")) return null;
        contributionKinds.set(candidate.optionKey, "financial");
      } else {
        return null;
      }
    }

    const result = parseGroupContributionProposalPayload(raw, contributionKinds);
    return result.ok && result.value.options.length > 0 ? result.value : null;
  } catch {
    return null;
  }
}

function persistDrafts(): void {
''')
if client.count(persist_anchor) != 1:
    raise SystemExit(
        f"Expected one resume-helper insertion point; found {client.count(persist_anchor)}"
    )
client = client.replace(persist_anchor, resume_helpers, 1)
client_path.write_text(client, encoding="utf-8")

html_path = Path("public/moral-trade-create/index.html")
html = html_path.read_text(encoding="utf-8")
key_anchor = '    const CREATE_DRAFT_STORAGE_KEY = "moral_trade_create_resume_v1";\n'
storage_bridge = dedent('''\
    const CREATE_DRAFT_STORAGE_KEY = "moral_trade_create_resume_v1";

    function createDraftResumeStorage() {
      try {
        if (window.top && window.top !== window) return window.top.sessionStorage;
      } catch {}
      return window.sessionStorage;
    }

    const CREATE_DRAFT_STORAGE = createDraftResumeStorage();
''')
if html.count(key_anchor) != 1:
    raise SystemExit(
        f"Expected one Create draft storage key; found {html.count(key_anchor)}"
    )
html = html.replace(key_anchor, storage_bridge, 1)

html_replacements = [
    (
        "sessionStorage.setItem(CREATE_DRAFT_STORAGE_KEY",
        "CREATE_DRAFT_STORAGE.setItem(CREATE_DRAFT_STORAGE_KEY",
        1,
        "Create resume write",
    ),
    (
        "sessionStorage.getItem(CREATE_DRAFT_STORAGE_KEY",
        "CREATE_DRAFT_STORAGE.getItem(CREATE_DRAFT_STORAGE_KEY",
        1,
        "Create resume read",
    ),
    (
        "sessionStorage.removeItem(CREATE_DRAFT_STORAGE_KEY",
        "CREATE_DRAFT_STORAGE.removeItem(CREATE_DRAFT_STORAGE_KEY",
        3,
        "Create resume cleanup",
    ),
]
for old, new, expected, label in html_replacements:
    count = html.count(old)
    if count != expected:
        raise SystemExit(f"Expected {expected} {label} occurrence(s); found {count}")
    html = html.replace(old, new)
html_path.write_text(html, encoding="utf-8")

frame_path = Path("src/components/create/create-interface-frame.tsx")
frame = frame_path.read_text(encoding="utf-8")
old_frame_expression = (
    'const resumeExpression =\n'
    '  \'const shouldResume = new URLSearchParams(window.location.search).get("resume") === "create";\';'
)
new_frame_expression = (
    'const resumeExpression =\n'
    '  /const shouldResume\\s*=\\s*(?:new URLSearchParams\\(window\\.location\\.search\\)|createDraftResumeRequestUrl\\(\\)\\.searchParams)\\.get\\("resume"\\)\\s*===\\s*"create";/;'
)
if frame.count(old_frame_expression) != 1:
    raise SystemExit("Expected one exact-string Create resume expression")
frame = frame.replace(old_frame_expression, new_frame_expression, 1)

old_frame_guard = '  if (!createInterfaceSource.includes(resumeExpression)) {'
new_frame_guard = '  if (!resumeExpression.test(createInterfaceSource)) {'
if frame.count(old_frame_guard) != 1:
    raise SystemExit("Expected one brittle Create resume-expression guard")
frame = frame.replace(old_frame_guard, new_frame_guard, 1)

old_frame_replacement = (
    '  return createInterfaceSource.replace(\n'
    '    resumeExpression,\n'
    '    `const shouldResume = true || new URLSearchParams(window.location.search).get("resume") === "create";`,\n'
    '  );'
)
new_frame_replacement = (
    '  return createInterfaceSource.replace(\n'
    '    resumeExpression,\n'
    '    "const shouldResume = true;",\n'
    '  );'
)
if frame.count(old_frame_replacement) != 1:
    raise SystemExit("Expected one brittle Create resume-expression replacement")
frame_path.write_text(
    frame.replace(old_frame_replacement, new_frame_replacement, 1),
    encoding="utf-8",
)

source_contract_path = Path("src/lib/create-interface/source-contract.test.ts")
source_contract = source_contract_path.read_text(encoding="utf-8")
old_storage_assertion = (
    '  assert.match(html, /sessionStorage\\.setItem\\(CREATE_DRAFT_STORAGE_KEY/);\n'
)
new_storage_assertions = (
    '  assert.match(html, /function createDraftResumeStorage/);\n'
    '  assert.match(html, /window\\.top\\.sessionStorage/);\n'
    '  assert.match(html, /CREATE_DRAFT_STORAGE\\.setItem\\(CREATE_DRAFT_STORAGE_KEY/);\n'
    '  assert.match(html, /CREATE_DRAFT_STORAGE\\.getItem\\(CREATE_DRAFT_STORAGE_KEY/);\n'
)
if source_contract.count(old_storage_assertion) != 1:
    raise SystemExit(
        "Expected one legacy iframe session-storage source assertion"
    )
source_contract = source_contract.replace(
    old_storage_assertion,
    new_storage_assertions,
    1,
)
old_frame_assertion = (
    '  assert.match(frame, /The Moral Trade Create resume contract could not be located/);\n'
)
new_frame_assertions = (
    old_frame_assertion
    + '  assert.match(frame, /resumeExpression\\.test\\(createInterfaceSource\\)/);\n'
    + '  assert.match(frame, /createInterfaceSource\\.replace\\([\\s\\S]*resumeExpression[\\s\\S]*const shouldResume = true/);\n'
)
if source_contract.count(old_frame_assertion) != 1:
    raise SystemExit("Expected one Create resume fail-closed source assertion")
source_contract = source_contract.replace(
    old_frame_assertion,
    new_frame_assertions,
    1,
)
source_contract_path.write_text(source_contract, encoding="utf-8")

stability_path = Path(
    "src/lib/create-interface/group-contribution-client-stability.test.ts"
)
stability = stability_path.read_text(encoding="utf-8")
if "ordinary value changes do not replace the active form control" in stability:
    raise SystemExit("The monetary-control stability regression already exists")
stability += dedent('''\

test("ordinary value changes do not replace the active form control", () => {
  const listeners = functionBody("installShadowDelegatedListeners");
  assert.match(listeners, /controlRequiresPanelRender\\(control\\)/);
  assert.match(listeners, /updateValidationStatus\\(entry\\)/);

  const structural = functionBody("controlRequiresPanelRender");
  assert.match(structural, /coActStructure/);
  assert.match(structural, /allocationMode/);
  assert.doesNotMatch(structural, /maximumBudgetMinor|targetMinor|noPoolDefault/);
});

test("authentication resume validates and restores the proposal on the summary screen", () => {
  const scan = functionBody("scanForOptions");
  assert.match(scan, /if \\(!root\\)[\\s\\S]*resumedProposal[\\s\\S]*writeProposalPayload\\(false\\)/);

  const payload = functionBody("readProposalPayload");
  assert.match(payload, /mounted\\.size === 0 && resumedProposal/);

  const restore = functionBody("readStoredResumeProposal");
  assert.match(restore, /parseGroupContributionProposalPayload/);
  assert.match(restore, /permitsGroupContributionMode/);
  assert.match(restore, /result\\.ok/);
});
''')
stability_path.write_text(stability, encoding="utf-8")

browser_path = Path("tests/create-group-contribution-proposal.spec.ts")
browser = browser_path.read_text(encoding="utf-8")
budget_anchor = '  await coFund.getByLabel("Your maximum budget").fill("5.00");\n'
budget_regression = (
    budget_anchor
    + '  await expect(coFund.getByLabel("Your maximum budget")).toHaveValue("5.00");\n'
)
if browser.count(budget_anchor) != 1:
    raise SystemExit(
        f"Expected one maximum-budget interaction; found {browser.count(budget_anchor)}"
    )
browser = browser.replace(budget_anchor, budget_regression, 1)
browser_path.write_text(browser, encoding="utf-8")
