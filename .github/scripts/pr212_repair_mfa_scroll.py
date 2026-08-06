from __future__ import annotations

from pathlib import Path

E2E = Path(".github/scripts/institutional-trade-qa-e2e.mjs")
CONTRACT = Path("src/institutional-product-completeness.test.ts")
TRIGGER = Path(".github/pr212-exact-head-qa-trigger-20260804.txt")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label} block, found {count}.")
    return text.replace(old, new, 1)


def main() -> None:
    e2e = E2E.read_text(encoding="utf-8")
    old_scroll = '''  await panel.waitFor({ state: "attached", timeout: 30_000 });
  await panel.scrollIntoViewIfNeeded();
  await panel.waitFor({ state: "visible", timeout: 30_000 });
'''
    new_scroll = '''  await panel.waitFor({ state: "attached", timeout: 30_000 });
  await panel.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await panel.waitFor({ state: "visible", timeout: 30_000 });
'''
    e2e = replace_once(e2e, old_scroll, new_scroll, "MFA account-security scroll")

    required_e2e = [
        'await panel.evaluate((element) => {',
        'element.scrollIntoView({ block: "center", inline: "nearest" });',
        'await panel.waitFor({ state: "visible", timeout: 30_000 });',
    ]
    missing = [marker for marker in required_e2e if marker not in e2e]
    if missing:
        raise SystemExit(f"Patched E2E script is missing required markers: {missing}")
    if 'await panel.scrollIntoViewIfNeeded();' in e2e:
        raise SystemExit("Patched E2E script still uses the actionability-gated scroll helper.")

    contract = CONTRACT.read_text(encoding="utf-8")
    old_contract_end = '''  ]) assert.match(qaScript, new RegExp(phrase, "i"), phrase);
});
'''
    new_contract_end = '''  ]) assert.match(qaScript, new RegExp(phrase, "i"), phrase);
  assert.match(qaScript, /panel\\.evaluate\\(\\(element\\) => \\{/);
  assert.match(
    qaScript,
    /element\\.scrollIntoView\\(\\{ block: "center", inline: "nearest" \\}\\);/,
  );
  assert.doesNotMatch(qaScript, /panel\\.scrollIntoViewIfNeeded\\(\\)/);
});
'''
    contract = replace_once(
        contract,
        old_contract_end,
        new_contract_end,
        "institutional authenticated-QA contract ending",
    )

    if not TRIGGER.exists():
        raise SystemExit(f"Expected one-use trigger file is absent: {TRIGGER}")

    E2E.write_text(e2e, encoding="utf-8")
    CONTRACT.write_text(contract, encoding="utf-8")
    TRIGGER.unlink()


if __name__ == "__main__":
    main()
