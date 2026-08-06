from __future__ import annotations

from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_exact(
    path: str,
    old: str,
    new: str,
    *,
    expected: int = 1,
    label: str,
) -> None:
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise SystemExit(
            f"{path}: {label}: expected {expected} occurrence(s), found {count}",
        )
    write(path, text.replace(old, new))


def replace_between(
    path: str,
    start: str,
    end: str,
    replacement: str,
    *,
    label: str,
) -> None:
    text = read(path)
    start_at = text.find(start)
    if start_at < 0:
        raise SystemExit(f"{path}: {label}: start marker missing")
    if text.find(start, start_at + len(start)) >= 0:
        raise SystemExit(f"{path}: {label}: start marker is not unique")
    end_at = text.find(end, start_at + len(start))
    if end_at < 0:
        raise SystemExit(f"{path}: {label}: end marker missing")
    write(path, text[:start_at] + replacement + text[end_at:])


def assert_no_markers(path: str) -> None:
    text = read(path)
    for marker in ("<<<<<<<", "=======", ">>>>>>>"):
        if marker in text:
            raise SystemExit(f"{path}: unresolved merge marker {marker!r}")


def resolve_index() -> None:
    path = "public/moral-trade-create/index.html"
    replace_between(
        path,
        '    const CREATE_INTERFACE_VERSION = "moral_trade_create_v1";',
        '    function createSubmissionKey() {',
        '''    const CREATE_INTERFACE_VERSION = "moral_trade_create_v1";
    const CREATE_DRAFT_STORAGE_KEY = "moral_trade_create_resume_v1";

    function createDraftStorage() {
      try {
        if (window.top && window.top !== window) {
          const storage = window.top.sessionStorage;
          storage.getItem(CREATE_DRAFT_STORAGE_KEY);
          return storage;
        }
      } catch {}
      try {
        const storage = window.sessionStorage;
        storage.getItem(CREATE_DRAFT_STORAGE_KEY);
        return storage;
      } catch {
        return null;
      }
    }

    function clearDraftForResume() {
      const storage = createDraftStorage();
      if (!storage) return;
      try { storage.removeItem(CREATE_DRAFT_STORAGE_KEY); } catch {}
    }

''',
        label="unify top-level resume storage",
    )
    replace_exact(
        path,
        '''<<<<<<< HEAD
      clearDraftForResume();
=======
      try { CREATE_DRAFT_STORAGE.removeItem(CREATE_DRAFT_STORAGE_KEY); } catch {}
>>>>>>> origin/feature/co-act-co-fund-create-v3-20260803''',
        '      clearDraftForResume();',
        label="reset cleanup",
    )
    replace_between(
        path,
        '    function saveDraftForResume() {',
        '    function renderSubmittedReceipt(submission) {',
        '''    function saveDraftForResume() {
      const storage = createDraftStorage();
      if (!storage) return false;
      try {
        const serialized = JSON.stringify({
          ...state,
          step: 4,
          offerPhase: "details",
          published: false,
        });
        storage.setItem(CREATE_DRAFT_STORAGE_KEY, serialized);
        return storage.getItem(CREATE_DRAFT_STORAGE_KEY) === serialized;
      } catch {
        return false;
      }
    }

    function restoreDraftForResume() {
      const shouldResume = new URLSearchParams(window.location.search).get("resume") === "create";
      if (!shouldResume) return false;
      const storage = createDraftStorage();
      if (!storage) return false;
      try {
        const saved = JSON.parse(storage.getItem(CREATE_DRAFT_STORAGE_KEY) || "null");
        if (!saved || typeof saved !== "object") return false;
        Object.assign(state, saved, { published: false, publishedId: "", publishedUrl: "" });
        // Keep the snapshot through a possible srcDoc remount. A durable receipt or explicit reset clears it.
        return true;
      } catch {
        return false;
      }
    }

''',
        label="unify save and restore",
    )
    replace_exact(
        path,
        '''<<<<<<< HEAD
        clearDraftForResume();
=======
        try { CREATE_DRAFT_STORAGE.removeItem(CREATE_DRAFT_STORAGE_KEY); } catch {}
>>>>>>> origin/feature/co-act-co-fund-create-v3-20260803''',
        '        clearDraftForResume();',
        label="durable-receipt cleanup",
    )
    assert_no_markers(path)


def resolve_client() -> None:
    path = "src/lib/create-interface/group-contribution-client.ts"
    replace_exact(
        path,
        '''<<<<<<< HEAD
import type { ParticipantTarget } from "./participant-target";
=======
import { parseGroupContributionProposalPayload } from "./group-contribution-payload";
>>>>>>> origin/feature/co-act-co-fund-create-v3-20260803''',
        '''import { parseGroupContributionProposalPayload } from "./group-contribution-payload";
import type { ParticipantTarget } from "./participant-target";''',
        label="combine participant and resume imports",
    )
    replace_exact(
        path,
        '  "coFundDeadlineOutcome",\n  "recurringMode",',
        '  "coFundDeadlineOutcome",\n  "allocationMode",\n  "recurringMode",',
        label="include allocation shape control",
    )
    replace_exact(
        path,
        '''<<<<<<< HEAD
    if (panelShapeChanged) scheduleMountedOptionRender(entry);
    else updateValidationStatus(entry);
=======
    if (controlRequiresPanelRender(control)) {
      scheduleMountedOptionRender(entry);
    } else {
      updateValidationStatus(entry);
    }
>>>>>>> origin/feature/co-act-co-fund-create-v3-20260803''',
        '''    if (panelShapeChanged) scheduleMountedOptionRender(entry);
    else updateValidationStatus(entry);''',
        label="retain account-aware shape rerender",
    )
    replace_between(
        path,
        'function controlRequiresPanelRender(',
        'function updateStateFromControl(',
        '',
        label="remove superseded parent shape helper",
    )
    combined_storage = '''function groupDraftStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    storage.getItem(STORAGE_KEY);
    return storage;
  } catch {
    try {
      const storage = createWindow().localStorage;
      storage.getItem(STORAGE_KEY);
      return storage;
    } catch {
      return null;
    }
  }
}

function resumeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.top && window.top !== window) return window.top.sessionStorage;
  } catch {
    // Cross-origin embedding falls back to the current application storage area.
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function resumeRequestUrl(): URL | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.top && window.top !== window) {
      return new URL(window.top.location.href);
    }
  } catch {
    // Cross-origin embedding falls back to the current window URL.
  }
  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
}

function isResumeRequest(): boolean {
  return resumeRequestUrl()?.searchParams.get("resume") === "create";
}

function restoreResumeDrafts(): void {
  if (!isResumeRequest()) return;
  try {
    const raw = resumeStorage()?.getItem(RESUME_DRAFT_STORAGE_KEY);
    const localStorage = groupDraftStorage();
    if (!raw || !localStorage) return;
    const parsed = JSON.parse(raw) as Partial<StoredDrafts>;
    if (parsed.version !== 1 || !parsed.drafts || typeof parsed.drafts !== "object") return;
    const snapshot: StoredDrafts = { version: 1, drafts: parsed.drafts };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Invalid or unavailable local state cannot override the validated proposal snapshot.
  }
}

function persistResumeProposal(proposal: GroupContributionProposalPayload): void {
  if (proposal.options.length === 0) return;
  resumedProposal = proposal;
  const storage = resumeStorage();
  if (!storage) return;
  try {
    storage.setItem(RESUME_STORAGE_KEY, JSON.stringify(proposal));
    const draftSnapshot = groupDraftStorage()?.getItem(STORAGE_KEY);
    if (draftSnapshot) storage.setItem(RESUME_DRAFT_STORAGE_KEY, draftSnapshot);
  } catch {
    // Authentication resume is best effort; the server remains authoritative.
  }
}

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

function readStoredResumeProposal(): GroupContributionProposalPayload | null {
  if (!isResumeRequest()) return null;
  try {
    const raw = resumeStorage()?.getItem(RESUME_STORAGE_KEY);
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
'''
    replace_between(
        path,
        '<<<<<<< HEAD\nfunction groupDraftStorage(): Storage | null {',
        'function persistDrafts(): void {',
        combined_storage + '\n',
        label="combine stable draft and validated resume storage",
    )
    assert_no_markers(path)


def resolve_source_contract() -> None:
    path = "src/lib/create-interface/source-contract.test.ts"
    replace_between(
        path,
        '<<<<<<< HEAD\n  assert.match(html, /function createDraftStorage\\(\\)/);',
        '  assert.doesNotMatch(html, /POOL-REV/);',
        '''  assert.match(html, /function createDraftStorage\(\)/);
  assert.match(html, /window\.top\.sessionStorage/);
  assert.match(html, /storage\.setItem\(CREATE_DRAFT_STORAGE_KEY/);
  assert.match(html, /step: 4/);
  assert.match(html, /offerPhase: "details"/);
  assert.match(html, /return storage\.getItem\(CREATE_DRAFT_STORAGE_KEY\) === serialized/);
  assert.match(html, /if \(!saveDraftForResume\(\)\)/);
  assert.match(html, /function clearDraftForResume\(\)/);
  assert.match(html, /Keep the snapshot through a possible srcDoc remount/);
  assert.doesNotMatch(html, /CREATE_DRAFT_STORAGE\.(?:setItem|getItem|removeItem)/);
''',
        label="combine resume source assertions",
    )
    assert_no_markers(path)


def resolve_playwright() -> None:
    path = "tests/create-group-contribution-proposal.spec.ts"
    replace_exact(
        path,
        '''<<<<<<< HEAD
  await coFund.getByLabel("Your private maximum contribution").fill("5.00");
=======
  await coFund.getByLabel("Your maximum budget").fill("5.00");
  await expect(coFund.getByLabel("Your maximum budget")).toHaveValue("5.00");
>>>>>>> origin/feature/co-act-co-fund-create-v3-20260803''',
        '''  await coFund.getByLabel("Your private maximum contribution").fill("5.00");
  await expect(coFund.getByLabel("Your private maximum contribution")).toHaveValue("5.00");''',
        label="account-bound private contribution fixture",
    )
    assert_no_markers(path)


def main() -> None:
    resolve_index()
    resolve_client()
    resolve_source_contract()
    resolve_playwright()


if __name__ == "__main__":
    main()
