from pathlib import Path
from textwrap import dedent

client_path = Path("src/lib/create-interface/group-contribution-client.ts")
client = client_path.read_text(encoding="utf-8")

old_keys = (
    'const RESUME_STORAGE_KEY = "mt:create:group-contribution-resume:v1";\n'
    'const PAYLOAD_FIELD = "groupContributionTerms";'
)
new_keys = (
    'const RESUME_STORAGE_KEY = "mt:create:group-contribution-resume:v1";\n'
    'const RESUME_DRAFT_STORAGE_KEY = "mt:create:group-contribution-resume-drafts:v1";\n'
    'const PAYLOAD_FIELD = "groupContributionTerms";'
)
if client.count(old_keys) != 1:
    raise SystemExit(f"Expected one resume-key block; found {client.count(old_keys)}")
client = client.replace(old_keys, new_keys, 1)

old_resume_context = dedent('''\
function isResumeRequest(): boolean {
  try {
    return new URL(window.location.href).searchParams.get("resume") === "create";
  } catch {
    return false;
  }
}
''')
new_resume_context = dedent('''\
function resumeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.top && window.top !== window) return window.top.sessionStorage;
  } catch {
    // Cross-origin embedding falls back to the iframe storage area.
  }
  return window.sessionStorage;
}

function resumeRequestUrl(): URL | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.top && window.top !== window) {
      return new URL(window.top.location.href);
    }
  } catch {
    // Cross-origin embedding falls back to the iframe URL.
  }
  return new URL(window.location.href);
}

function isResumeRequest(): boolean {
  try {
    return resumeRequestUrl()?.searchParams.get("resume") === "create";
  } catch {
    return false;
  }
}

function restoreResumeDrafts(): void {
  if (!isResumeRequest()) return;
  try {
    const raw = resumeStorage()?.getItem(RESUME_DRAFT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<StoredDrafts>;
    if (parsed.version !== 1 || !parsed.drafts || typeof parsed.drafts !== "object") return;
    const snapshot: StoredDrafts = { version: 1, drafts: parsed.drafts };
    createWindow().localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Invalid or unavailable local state cannot override the validated proposal snapshot.
  }
}
''')
if client.count(old_resume_context) != 1:
    raise SystemExit(
        f"Expected one iframe-only resume context; found {client.count(old_resume_context)}"
    )
client = client.replace(old_resume_context, new_resume_context, 1)

old_activation = (
    '  activeWindow = targetWindow;\n'
    '  activeDocument = targetDocument;\n'
    '  resumedProposal = readStoredResumeProposal();\n'
    '  scanQueued = false;'
)
new_activation = (
    '  activeWindow = targetWindow;\n'
    '  activeDocument = targetDocument;\n'
    '  restoreResumeDrafts();\n'
    '  resumedProposal = readStoredResumeProposal();\n'
    '  scanQueued = false;'
)
if client.count(old_activation) != 1:
    raise SystemExit(f"Expected one resume activation block; found {client.count(old_activation)}")
client = client.replace(old_activation, new_activation, 1)

primary_start = client.index("function readPrimaryText(")
primary_end = client.index("\nfunction renderMountedOption(", primary_start)
primary = client[primary_start:primary_end]

loop_anchor = "  for (const field of preferredFields) {\n"
if primary.count(loop_anchor) != 1:
    raise SystemExit(
        f"Expected one preferred-field loop in readPrimaryText; found {primary.count(loop_anchor)}"
    )
primary = primary.replace(
    loop_anchor,
    "  let hasPreferredControl = false;\n  for (const field of preferredFields) {\n",
    1,
)

value_anchor = '    const value = control?.value.trim() ?? "";\n'
if primary.count(value_anchor) != 1:
    raise SystemExit(
        f"Expected one preferred-field value read in readPrimaryText; found {primary.count(value_anchor)}"
    )
primary = primary.replace(
    value_anchor,
    '    if (control) hasPreferredControl = true;\n    const value = control?.value.trim() ?? "";\n',
    1,
)

fallback_anchor = (
    "  }\n\n"
    "  const controls = card.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(\n"
)
if primary.count(fallback_anchor) != 1:
    raise SystemExit(
        f"Expected one generic-control fallback in readPrimaryText; found {primary.count(fallback_anchor)}"
    )
primary = primary.replace(
    fallback_anchor,
    "  }\n  if (hasPreferredControl) return \"\";\n\n"
    "  const controls = card.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(\n",
    1,
)
client = client[:primary_start] + primary + client[primary_end:]

old_persist = dedent('''\
function persistResumeProposal(proposal: GroupContributionProposalPayload): void {
  if (proposal.options.length === 0) return;
  try {
    window.sessionStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(proposal));
    resumedProposal = proposal;
  } catch {
    // Authentication resume is best effort; the server remains authoritative.
  }
}
''')
new_persist = dedent('''\
function persistResumeProposal(proposal: GroupContributionProposalPayload): void {
  if (proposal.options.length === 0) return;
  resumedProposal = proposal;
  const storage = resumeStorage();
  if (!storage) return;
  try {
    storage.setItem(RESUME_STORAGE_KEY, JSON.stringify(proposal));
    const draftSnapshot = createWindow().localStorage.getItem(STORAGE_KEY);
    if (draftSnapshot) storage.setItem(RESUME_DRAFT_STORAGE_KEY, draftSnapshot);
  } catch {
    // Authentication resume is best effort; the server remains authoritative.
  }
}
''')
if client.count(old_persist) != 1:
    raise SystemExit(f"Expected one resume-persist function; found {client.count(old_persist)}")
client = client.replace(old_persist, new_persist, 1)

old_clear = dedent('''\
function clearResumeProposal(): void {
  resumedProposal = null;
  try {
    window.sessionStorage.removeItem(RESUME_STORAGE_KEY);
  } catch {
    // A successful server receipt is authoritative even if local cleanup fails.
  }
}
''')
new_clear = dedent('''\
function clearResumeProposal(): void {
  resumedProposal = null;
  const storage = resumeStorage();
  if (!storage) return;
  try {
    storage.removeItem(RESUME_STORAGE_KEY);
    storage.removeItem(RESUME_DRAFT_STORAGE_KEY);
  } catch {
    // A successful server receipt is authoritative even if local cleanup fails.
  }
}
''')
if client.count(old_clear) != 1:
    raise SystemExit(f"Expected one resume-cleanup function; found {client.count(old_clear)}")
client = client.replace(old_clear, new_clear, 1)

old_read = "    const raw = window.sessionStorage.getItem(RESUME_STORAGE_KEY);"
new_read = "    const raw = resumeStorage()?.getItem(RESUME_STORAGE_KEY);"
if client.count(old_read) != 1:
    raise SystemExit(f"Expected one resume-proposal read; found {client.count(old_read)}")
client = client.replace(old_read, new_read, 1)

client_path.write_text(client, encoding="utf-8")

stability_path = Path(
    "src/lib/create-interface/group-contribution-client-stability.test.ts"
)
stability = stability_path.read_text(encoding="utf-8")
test_name = "authentication resume uses the same top-level request and storage context"
if test_name in stability:
    raise SystemExit("The top-level resume-context regression already exists")

stability += "\n" + dedent(r'''
test("semantic primary fields never fall through to duration or currency", () => {
  const primary = functionBody("readPrimaryText");
  assert.match(primary, /let hasPreferredControl = false/);
  assert.match(primary, /if \(control\) hasPreferredControl = true/);
  assert.match(primary, /if \(hasPreferredControl\) return ""/);
});

test("authentication resume uses the same top-level request and storage context", () => {
  const request = functionBody("isResumeRequest");
  assert.match(request, /resumeRequestUrl\(\)/);

  const requestUrl = functionBody("resumeRequestUrl");
  assert.match(requestUrl, /typeof window === "undefined"/);
  assert.match(requestUrl, /window\.top/);
  assert.match(requestUrl, /window\.location\.href/);

  const storage = functionBody("resumeStorage");
  assert.match(storage, /typeof window === "undefined"/);
  assert.match(storage, /window\.top\.sessionStorage/);
  assert.match(storage, /window\.sessionStorage/);

  const restoreProposal = functionBody("readStoredResumeProposal");
  assert.match(restoreProposal, /resumeStorage\(\)\?\.getItem/);
});

test("authentication resume restores the exact editable group draft snapshot", () => {
  const persist = functionBody("persistResumeProposal");
  assert.match(persist, /createWindow\(\)\.localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(persist, /RESUME_DRAFT_STORAGE_KEY/);

  const restore = functionBody("restoreResumeDrafts");
  assert.match(restore, /RESUME_DRAFT_STORAGE_KEY/);
  assert.match(restore, /parsed\.version !== 1/);
  assert.match(restore, /createWindow\(\)\.localStorage\.setItem\(STORAGE_KEY/);

  const activate = functionBody("activateCreateDocument");
  assert.ok(activate.indexOf("restoreResumeDrafts();") < activate.indexOf("readStoredResumeProposal();"));

  const clear = functionBody("clearResumeProposal");
  assert.match(clear, /removeItem\(RESUME_STORAGE_KEY\)/);
  assert.match(clear, /removeItem\(RESUME_DRAFT_STORAGE_KEY\)/);
});
''')
stability_path.write_text(stability, encoding="utf-8")
