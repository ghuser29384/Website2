from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    file_path = Path(path)
    source = file_path.read_text(encoding="utf-8")
    count = source.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} match(es), found {count}")
    file_path.write_text(source.replace(old, new), encoding="utf-8")


replace_exact(
    "src/components/dashboard/background-account-security-panel.tsx",
    r'pattern="[0-9\\s-]{6,8}"',
    r'pattern="[0-9\s-]{6,8}"',
    expected=2,
)

replace_exact(
    "src/app/dashboard/page.tsx",
    '              <Link className="v72-shortcut-tile" href={item.href} key={item.label}>',
    "              <Link\n"
    '                className="v72-shortcut-tile"\n'
    "                href={item.href}\n"
    "                key={item.label}\n"
    '                prefetch={item.href === "/offers" ? false : undefined}\n'
    "              >",
)

test_path = Path("src/dashboard-account-security-visibility.test.ts")
test_source = test_path.read_text(encoding="utf-8")
if "authenticator code inputs use a browser-valid pattern" in test_source:
    raise SystemExit("focused diagnostics tests already exist")

addition = """

test("authenticator code inputs use a browser-valid pattern", () => {
  const validPattern = String.raw`pattern="[0-9\\s-]{6,8}"`;
  const invalidPattern = String.raw`pattern="[0-9\\\\s-]{6,8}"`;

  assert.equal(accountSecurityPanel.split(validPattern).length - 1, 2);
  assert.equal(accountSecurityPanel.includes(invalidPattern), false);
});

test("the stale Offers shortcut cannot prefetch a missing route", () => {
  assert.ok(
    dashboard.includes(
      [
        "              <Link",
        '                className="v72-shortcut-tile"',
        "                href={item.href}",
        "                key={item.label}",
        '                prefetch={item.href === "/offers" ? false : undefined}',
        "              >",
      ].join("\\n"),
    ),
  );
});
"""
test_path.write_text(test_source.rstrip() + addition, encoding="utf-8")
