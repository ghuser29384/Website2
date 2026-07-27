#!/usr/bin/env python3
from pathlib import Path

SCRIPT = Path(".github/scripts/collective-commitments-adversarial-browser-qa.mjs")
text = SCRIPT.read_text()


def replace_exact(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label}; found {count}.")
    text = text.replace(old, new)


replace_exact(
    '''  await Promise.all([
    page.waitForURL(/\/collective-commitments\/[0-9a-f-]+$/i, { timeout: 30_000 }),
    page.getByRole("button", { name: "Create collective commitment" }).click(),
  ]);
''',
    '''  await Promise.all([
    page.waitForURL(/\/collective-commitments\/[0-9a-f-]+$/i, {
      timeout: 30_000,
      waitUntil: "commit",
    }),
    page.getByRole("button", { name: "Create collective commitment" }).click(),
  ]);
''',
    "creation navigation wait",
)

replace_exact(
    '''  const result = {
    commitmentIds: [...createdCommitmentIds],
    credentialIds: [...createdCredentialIds],
    userIds: createdUsers.map((user) => user.id),
    deleted: {},
    remaining: {},
  };
''',
    '''  const userIds = createdUsers.map((user) => user.id);
  if (userIds.length) {
    const { data: discovered, error } = await admin
      .from("collective_commitments")
      .select("id")
      .in("creator_id", userIds)
      .like("title", `${TITLE_PREFIX}${runTag}]%`);
    if (error) throw new Error(error.message);
    for (const row of discovered ?? []) {
      if (!createdCommitmentIds.includes(row.id)) createdCommitmentIds.push(row.id);
    }
  }

  const result = {
    commitmentIds: [...createdCommitmentIds],
    credentialIds: [...createdCredentialIds],
    userIds,
    deleted: {},
    remaining: {},
  };
''',
    "exact-run commitment discovery",
)

replace_exact(
    '''  for (const user of [...createdUsers].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) result.deleted[`user:${user.id}`] = error.message;
  }
''',
    '''  if (userIds.length) {
    const { error } = await admin.from("profiles").delete().in("id", userIds);
    if (error) result.deleted.profilesError = error.message;
  }
  for (const user of [...createdUsers].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) result.deleted[`user:${user.id}`] = error.message;
  }
''',
    "profile-before-auth cleanup",
)

SCRIPT.write_text(text)
