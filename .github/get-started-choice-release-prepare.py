from __future__ import annotations

import os
import pathlib
import subprocess
import sys

REPO = "ghuser29384/Website2"
BASE_SHA = "ccc581e3e310d0ad3fc23cc101cf7c54cbe0b8bf"
ORIGINAL_START_SHA = "de1fc6f59ac395f8b81ff1e3fba15b2dff6e7ab9"
GUEST_CTA_SHA = "a9c64c7a2831762aacebc9eb00ec7329036aca3c"
EXPECTED_OLD_HEAD = "aa9a8b8dd090e10b035a3c2e61999de9544092dc"
CANDIDATE_BRANCH = "fix/get-started-choice-router-20260926"

START_FILES = [
    "src/app/start/page.tsx",
    "src/app/start/start.module.css",
    "src/lib/action-first-positioning.test.ts",
    "src/lib/public-route-smoke.test.ts",
    "src/lib/start-entry-router.test.ts",
    "tests/meta-explanatory-copy.spec.ts",
    "tests/pilot-copy.spec.ts",
    "tests/sitewide-canonical-visual-fidelity.spec.ts",
    "tests/start-entry-router.spec.ts",
]

GUEST_FILES = [
    "public/moral-trade-discover.html",
    "public/moral-trade-live-navigation.js",
    "public/moral-trade-refined-header.css",
    "src/sitewide-account-identity.test.ts",
    "tests/helpers/discover.ts",
    "tests/refined-header.spec.ts",
]

EXPECTED_FILES = sorted(
    START_FILES
    + GUEST_FILES
    + ["public/moral-trade-account-identity.js"]
)


def run(*args: str, cwd: pathlib.Path, capture: bool = False) -> str:
    result = subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
    )
    return result.stdout.strip() if capture else ""


def write_from_commit(worktree: pathlib.Path, commit: str, relative_path: str) -> None:
    content = run("git", "show", f"{commit}:{relative_path}", cwd=worktree, capture=True)
    destination = worktree / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content + "\n")


def merge_account_identity(worktree: pathlib.Path) -> None:
    path = worktree / "public/moral-trade-account-identity.js"
    text = path.read_text()
    replacements = [
        (
            "  const ROOT_SELECTOR = '.topbar,[role=\"banner\"],header';\n",
            "  const ROOT_SELECTOR = '.topbar,[role=\"banner\"],header';\n"
            "  const GUEST_ONLY_SELECTOR = '[data-mt-guest-only=\"true\"]';\n",
        ),
        (
            "  let identity = normalizeIdentity(\n"
            "    hasBootstrap ? window.__MT_LIVE_ACCOUNT_BOOTSTRAP__ : { authenticated: false },\n"
            "  );\n"
            "  let scheduled = false;\n",
            "  let identity = normalizeIdentity(\n"
            "    hasBootstrap ? window.__MT_LIVE_ACCOUNT_BOOTSTRAP__ : { authenticated: false },\n"
            "  );\n"
            "  let identityResolved = hasBootstrap;\n"
            "  let scheduled = false;\n",
        ),
        (
            "  function patchLegacyGreetings() {\n",
            "  function patchGuestOnlyActions() {\n"
            "    const shouldShow = identityResolved && !identity.authenticated;\n\n"
            "    document.querySelectorAll(GUEST_ONLY_SELECTOR).forEach((element) => {\n"
            "      element.hidden = !shouldShow;\n"
            "      element.toggleAttribute(\"aria-hidden\", !shouldShow);\n"
            "    });\n"
            "  }\n\n"
            "  function patchLegacyGreetings() {\n",
        ),
        (
            "  function patchAll() {\n"
            "    patchAvatarCandidates();\n",
            "  function patchAll() {\n"
            "    patchGuestOnlyActions();\n"
            "    patchAvatarCandidates();\n",
        ),
        (
            "      .then((payload) => {\n"
            "        identity = normalizeIdentity(payload);\n"
            "        schedulePatch();\n",
            "      .then((payload) => {\n"
            "        identity = normalizeIdentity(payload);\n"
            "        identityResolved = true;\n"
            "        schedulePatch();\n",
        ),
    ]
    for old, new in replacements:
        if text.count(old) != 1:
            raise RuntimeError(f"Unexpected account identity source around {old!r}")
        text = text.replace(old, new)
    for required in (
        ".mt-feed-actions .date span.muted",
        "identityResolved && !identity.authenticated",
        "element.hidden = !shouldShow",
    ):
        if required not in text:
            raise RuntimeError(f"Missing integrated behavior: {required}")
    path.write_text(text)


def main() -> None:
    if os.environ.get("GITHUB_REPOSITORY") != REPO:
        raise RuntimeError("Wrong repository")
    if len(sys.argv) != 2:
        raise RuntimeError("Expected candidate worktree path")
    worktree = pathlib.Path(sys.argv[1]).resolve()

    if run("git", "rev-parse", "HEAD", cwd=worktree, capture=True) != BASE_SHA:
        raise RuntimeError("Candidate checkout is not the approved base")
    remote_main = run("git", "ls-remote", "origin", "refs/heads/main", cwd=worktree, capture=True).split()[0]
    if remote_main != BASE_SHA:
        raise RuntimeError(f"Main advanced to {remote_main}; rebuild from the new base")
    remote_candidate_line = run(
        "git", "ls-remote", "origin", f"refs/heads/{CANDIDATE_BRANCH}", cwd=worktree, capture=True
    )
    remote_candidate = remote_candidate_line.split()[0] if remote_candidate_line else ""
    if remote_candidate != EXPECTED_OLD_HEAD:
        raise RuntimeError(f"Candidate branch changed unexpectedly: {remote_candidate}")

    for relative_path in START_FILES:
        write_from_commit(worktree, ORIGINAL_START_SHA, relative_path)
    for relative_path in GUEST_FILES:
        write_from_commit(worktree, GUEST_CTA_SHA, relative_path)
    merge_account_identity(worktree)

    run("git", "add", "--", *EXPECTED_FILES, cwd=worktree)
    actual_files = run("git", "diff", "--cached", "--name-only", cwd=worktree, capture=True).splitlines()
    if sorted(actual_files) != EXPECTED_FILES:
        raise RuntimeError(f"Unexpected candidate files: {actual_files}")
    run("git", "diff", "--cached", "--check", cwd=worktree)
    for excluded in (
        "public/moral-trade-live-feed.css",
        "public/moral-trade-live-local-time.js",
        "public/moral-trade-live-account.js",
    ):
        if run("git", "diff", "--cached", "--", excluded, cwd=worktree, capture=True):
            raise RuntimeError(f"Unrelated live Feed file changed: {excluded}")

    run("git", "config", "user.name", "github-actions[bot]", cwd=worktree)
    run(
        "git",
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
        cwd=worktree,
    )
    run("git", "commit", "-m", "Route Get Started visitors to walkthrough or login", cwd=worktree)
    candidate_sha = run("git", "rev-parse", "HEAD", cwd=worktree, capture=True)
    run(
        "git",
        "push",
        f"--force-with-lease=refs/heads/{CANDIDATE_BRANCH}:{EXPECTED_OLD_HEAD}",
        "origin",
        f"HEAD:refs/heads/{CANDIDATE_BRANCH}",
        cwd=worktree,
    )
    output = pathlib.Path(os.environ["GITHUB_OUTPUT"])
    with output.open("a") as stream:
        stream.write(f"sha={candidate_sha}\n")


if __name__ == "__main__":
    main()
