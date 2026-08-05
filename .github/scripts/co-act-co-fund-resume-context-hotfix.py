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
function createResumeStorage(): Storage {
  try {
    if (window.top && window.top !== window) return window.top.sessionStorage;
  } catch {
    // Cross-origin embedding falls back to the iframe storage area.
  }
  return window.sessionStorage;
}

const RESUME_STORAGE = createResumeStorage();

function resumeRequestUrl(): URL {
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
    return resumeRequestUrl().searchParams.get("resume") === "create";
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
        "RESUME_STORAGE.setItem(RESUME_STORAGE_KEY",
        "resume proposal write",
    ),
    (
        "window.sessionStorage.getItem(RESUME_STORAGE_KEY",
        "RESUME_STORAGE.getItem(RESUME_STORAGE_KEY",
        "resume proposal read",
    ),
    (
        "window.sessionStorage.removeItem(RESUME_STORAGE_KEY",
        "RESUME_STORAGE.removeItem(RESUME_STORAGE_KEY",
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
old_assertions = dedent(r'''\
  const restore = functionBody("readStoredResumeProposal");
  assert.match(restore, /parseGroupContributionProposalPayload/);
  assert.match(restore, /permitsGroupContributionMode/);
  assert.match(restore, /result\.ok/);
});
''')
new_assertions = dedent(r'''\
  const request = functionBody("isResumeRequest");
  assert.match(request, /resumeRequestUrl\(\)/);

  const requestUrl = functionBody("resumeRequestUrl");
  assert.match(requestUrl, /window\.top/);
  assert.match(requestUrl, /window\.location\.href/);

  const storage = functionBody("createResumeStorage");
  assert.match(storage, /window\.top\.sessionStorage/);
  assert.match(storage, /window\.sessionStorage/);

  const restore = functionBody("readStoredResumeProposal");
  assert.match(restore, /RESUME_STORAGE\.getItem/);
  assert.match(restore, /parseGroupContributionProposalPayload/);
  assert.match(restore, /permitsGroupContributionMode/);
  assert.match(restore, /result\.ok/);
});
''')
if stability.count(old_assertions) != 1:
    raise SystemExit(
        f"Expected one generated authentication-resume assertion block; found {stability.count(old_assertions)}"
    )
stability_path.write_text(
    stability.replace(old_assertions, new_assertions, 1),
    encoding="utf-8",
)
