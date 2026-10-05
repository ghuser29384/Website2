from __future__ import annotations

from pathlib import Path

TARGET = Path(".github/scripts/institutional-trade-qa-e2e.mjs")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label} block, found {count}.")
    return text.replace(old, new, 1)


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '    user_metadata: { display_name: displayName },\n',
        '    user_metadata: {\n'
        '      display_name: displayName,\n'
        '      qa_fixture: true,\n'
        '      one_person_qa_run_id: runId,\n'
        '    },\n',
        "QA fixture metadata",
    )

    text = replace_once(
        text,
        '  const panel = page.locator("article#account-security");\n'
        '  await panel.waitFor({ state: "visible", timeout: 30_000 });\n',
        '  const panel = page.locator("article#account-security");\n'
        '  await panel.waitFor({ state: "attached", timeout: 30_000 });\n'
        '  await panel.scrollIntoViewIfNeeded();\n'
        '  await panel.waitFor({ state: "visible", timeout: 30_000 });\n',
        "account-security visibility",
    )

    old_cleanup = '''  if (createdUserIds.length) {
    const audits = await admin.from("institutional_audit_events").delete().in("actor_profile_id", createdUserIds);
    if (audits.error) throw audits.error;
    const profiles = await admin.from("profiles").delete().in("id", createdUserIds);
    if (profiles.error) throw profiles.error;
    for (const id of createdUserIds) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error && !/not found/i.test(result.error.message)) throw result.error;
    }
  }
'''
    new_cleanup = '''  if (createdUserIds.length) {
    const audits = await admin.from("institutional_audit_events").delete().in("actor_profile_id", createdUserIds);
    if (audits.error) throw audits.error;
    for (const id of createdUserIds) {
      const result = await admin.rpc("cleanup_one_person_qa_fixture_v1", {
        p_profile_id: id,
        p_qa_run_id: runId,
      });
      if (result.error) {
        throw new Error(`cleanup_one_person_qa_fixture_v1 ${id}: ${result.error.message}`);
      }
    }
  }
'''
    text = replace_once(text, old_cleanup, new_cleanup, "synthetic-user cleanup")

    required = [
        "qa_fixture: true",
        "one_person_qa_run_id: runId",
        'await panel.scrollIntoViewIfNeeded();',
        'admin.rpc("cleanup_one_person_qa_fixture_v1"',
    ]
    missing = [marker for marker in required if marker not in text]
    if missing:
        raise SystemExit(f"Patched E2E script is missing required markers: {missing}")

    forbidden = [
        'user_metadata: { display_name: displayName }',
        'const profiles = await admin.from("profiles").delete().in("id", createdUserIds);',
        'const result = await admin.auth.admin.deleteUser(id);',
    ]
    present = [marker for marker in forbidden if marker in text]
    if present:
        raise SystemExit(f"Patched E2E script retains obsolete markers: {present}")

    TARGET.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
