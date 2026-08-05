from pathlib import Path
from textwrap import dedent

client_path = Path("src/lib/create-interface/group-contribution-client.ts")
client = client_path.read_text(encoding="utf-8")

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
''')
if client.count(old_resume_context) != 1:
    raise SystemExit(
        f"Expected one iframe-only resume context; found {client.count(old_resume_context)}"
    )
client = client.replace(old_resume_context, new_resume_context, 1)

storage_replacements = [
    (
        "window.sessionStorage.setItem(RESUME_STORAGE_KEY",
        "resumeStorage()?.setItem(RESUME_STORAGE_KEY",
        "resume proposal write",
    ),
    (
        "window.sessionStorage.getItem(RESUME_STORAGE_KEY",
        "resumeStorage()?.getItem(RESUME_STORAGE_KEY",
        "resume proposal read",
    ),
    (
        "window.sessionStorage.removeItem(RESUME_STORAGE_KEY",
        "resumeStorage()?.removeItem(RESUME_STORAGE_KEY",
        "resume proposal cleanup",
    ),
]
for old, new, label in storage_replacements:
    count = client.count(old)
    if count != 1:
        raise SystemExit(f"Expected one {label}; found {count}")
    client = client.replace(old, new, 1)

client_path.write_text(client, encoding="utf-8")

stability_path = Path(
    "src/lib/create-interface/group-contribution-client-stability.test.ts"
)
stability = stability_path.read_text(encoding="utf-8")
test_name = "authentication resume uses the same top-level request and storage context"
if test_name in stability:
    raise SystemExit("The top-level resume-context regression already exists")

stability += "\n" + dedent(r'''
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

  const restore = functionBody("readStoredResumeProposal");
  assert.match(restore, /resumeStorage\(\)\?\.getItem/);
});
''')
stability_path.write_text(stability, encoding="utf-8")
