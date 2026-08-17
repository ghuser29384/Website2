from __future__ import annotations

from pathlib import Path
import re


def sub_once(
    path: str,
    pattern: str,
    replacement: str,
    label: str,
    *,
    flags: int = 0,
    expand: bool = False,
) -> None:
    file = Path(path)
    source = file.read_text()
    replacer = (
        (lambda match: match.expand(replacement))
        if expand
        else (lambda _match: replacement)
    )
    updated, count = re.subn(pattern, replacer, source, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{path}: {label}: expected one regex match, found {count}")
    file.write_text(updated)


sub_once(
    "src/lib/walkthrough-profile.ts",
    r"export const WALKTHROUGH_PROFILE_MAX_AGE_SECONDS = 60 \* 60 \* 24 \* 7;",
    "export const WALKTHROUGH_PROFILE_MAX_AGE_SECONDS = 60 * 60 * 4;",
    "reduce handoff retention",
)
sub_once(
    "src/app/walkthrough/actions.ts",
    r'(cookieStore\.set\(WALKTHROUGH_PROFILE_COOKIE_NAME, encodeWalkthroughProfileDraft\(draft\), \{.*?\n\s*)path: "/",',
    r'\1path: "/complete-profile",',
    "scope handoff cookie",
    flags=re.S,
    expand=True,
)

actions = "src/app/complete-profile/actions.ts"
sub_once(
    actions,
    r'(function read\(formData: FormData, key: string\) \{.*?\n\})\n',
    r'''\1

function getSafeErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "unknown";
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(code)
    ? code
    : "unknown";
}
''',
    "insert safe log-code helper",
    flags=re.S,
    expand=True,
)

raw_logs = [
    ("Failed to encrypt complete-profile preferences", "error"),
    ("Failed to update complete profile identity", "profileError"),
    ("Failed to save complete profile onboarding", "onboardingError"),
    ("Failed to save complete profile matching preferences", "wishProfileError"),
    ("Failed to attach ranked priorities to profile synthesis", "synthesisError"),
]
for message, variable in raw_logs:
    sub_once(
        actions,
        rf'console\.error\(\s*"{re.escape(message)}",\s*{variable}\s*\);',
        f'console.error("{message}", {{ code: getSafeErrorCode({variable}) }});',
        f"sanitize {message}",
        flags=re.S,
    )

sub_once(
    actions,
    r'''console\.error\(\s*"Failed to persist completed profile activation",\s*\{\s*message:\s*transitionError\?\.message\s*\?\?\s*"Unexpected activation stage",\s*profileId:\s*viewer\.authUser\.id,\s*transitionedStage,\s*\}\s*\);''',
    '''console.error("Failed to persist completed profile activation", {
      reason: transitionError ? "transition_error" : "unexpected_stage",
    });''',
    "sanitize final activation log",
    flags=re.S,
)
sub_once(
    actions,
    r'''if \(profileSource === "walkthrough"\) \{\s*const cookieStore = await cookies\(\);\s*cookieStore\.delete\(WALKTHROUGH_PROFILE_COOKIE_NAME\);\s*\}''',
    '''if (profileSource === "walkthrough") {
    const cookieStore = await cookies();
    // Clear both the historical root-scoped cookie and the current private handoff cookie.
    cookieStore.delete(WALKTHROUGH_PROFILE_COOKIE_NAME);
    cookieStore.set(WALKTHROUGH_PROFILE_COOKIE_NAME, "", {
      expires: new Date(0),
      httpOnly: true,
      path: "/complete-profile",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }''',
    "clear scoped handoff cookie",
    flags=re.S,
)

test_path = "src/walkthrough-private-handoff.test.ts"
sub_once(
    test_path,
    r'''  const actionSource = readFileSync\("src/app/walkthrough/actions\.ts", "utf8"\);\n  const pageSource = readFileSync\("src/app/complete-profile/page\.tsx", "utf8"\);\n\n  assert\.doesNotMatch\(actionSource, /profileId:/\);\n  assert\.doesNotMatch\(actionSource, /message:\\s\*transitionError/\);\n  assert\.match\(actionSource, /buildWalkthroughCompleteProfilePath\\\(draft\\\)/\);\n  assert\.match\(pageSource, /hasWalkthroughPrivateQuery\\\(resolvedSearchParams\\\)/\);\n  assert\.match\(pageSource, /const baseReturnTo = "\\/complete-profile"/\);\n  assert\.doesNotMatch\(pageSource, /buildCompleteProfilePath/\);\n  assert\.doesNotMatch\(pageSource, /walkthrough_cause/\);\n  assert\.doesNotMatch\(pageSource, /match_get/\);\n  assert\.doesNotMatch\(pageSource, /match_give/\);''',
    '''  const actionSource = readFileSync("src/app/walkthrough/actions.ts", "utf8");
  const completeActionSource = readFileSync("src/app/complete-profile/actions.ts", "utf8");
  const pageSource = readFileSync("src/app/complete-profile/page.tsx", "utf8");

  assert.doesNotMatch(actionSource, /profileId:/);
  assert.doesNotMatch(actionSource, /message:\\s*transitionError/);
  assert.match(actionSource, /path:\\s*"\\/complete-profile"/);
  assert.match(actionSource, /buildWalkthroughCompleteProfilePath\\(draft\\)/);
  assert.doesNotMatch(completeActionSource, /profileId:/);
  assert.doesNotMatch(completeActionSource, /message:\\s*transitionError/);
  assert.doesNotMatch(
    completeActionSource,
    /console\\.error\\([^;]+,\\s*(?:error|profileError|onboardingError|wishProfileError|synthesisError)\\);/s,
  );
  assert.match(completeActionSource, /getSafeErrorCode/);
  assert.match(completeActionSource, /path:\\s*"\\/complete-profile"/);
  assert.match(pageSource, /hasWalkthroughPrivateQuery\\(resolvedSearchParams\\)/);
  assert.match(pageSource, /const baseReturnTo = "\\/complete-profile"/);
  assert.doesNotMatch(pageSource, /buildCompleteProfilePath/);
  assert.doesNotMatch(pageSource, /walkthrough_cause/);
  assert.doesNotMatch(pageSource, /match_get/);
  assert.doesNotMatch(pageSource, /match_give/);''',
    "extend privacy source contract",
    flags=re.S,
)
