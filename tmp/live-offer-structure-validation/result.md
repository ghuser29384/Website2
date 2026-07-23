# Structured Live offer validation

- npm install: 0
- JavaScript syntax: 0
- Exact-live source contract: 0
- Focused ESLint: 0
- Chromium installation: 0
- Chromium Playwright: 1
- Route: `/moral-trade-live.html#trade`
- Offer types: Money; Behavior or commitment; Help or service
- Shared attributes: Estimated time; Relevant skills; Deliverable or completion condition; Verification method

Exit code 0 means passed. Exit code 99 means skipped because an earlier prerequisite failed.

## Source-contract tail
```
TAP version 13
# Subtest: the exact live shell loads structured offer types and autocomplete for editable terms
ok 1 - the exact live shell loads structured offer types and autocomplete for editable terms
  ---
  duration_ms: 3.238575
  type: 'test'
  ...
1..1
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 349.976175
```

## Lint tail
```

```

## Browser tail
```

Running 2 tests using 1 worker
·F

  1) tests/exact-live-autocomplete.spec.ts:87:5 › the exact live offer palette uses three offer types and collects shared attributes 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoHaveAttribute[2m([22m[32mexpected[39m[2m)[22m failed

    Locator: locator('.clause').filter({ has: locator('.clause-label').filter({ hasText: 'Behavior or commitment' }) }).locator('.token[contenteditable="true"]')
    Expected: [32m"true"[39m
    Error: strict mode violation: locator('.clause').filter({ has: locator('.clause-label').filter({ hasText: 'Behavior or commitment' }) }).locator('.token[contenteditable="true"]') resolved to 5 elements:
        1) <span spellcheck="true" contenteditable="true" aria-haspopup="listbox" aria-autocomplete="list" class="token mt-offer-token" data-mt-autocomplete-ready="true" data-mt-autocomplete="commitments" data-mt-autocomplete-context="commitments" title="Type to see standardized suggestions">describe the behavior or commitment</span> aka getByText('describe the behavior or')
        2) <span spellcheck="true" contenteditable="true" aria-haspopup="listbox" aria-autocomplete="list" data-mt-autocomplete-ready="true" data-mt-autocomplete="commitments" data-mt-autocomplete-context="commitments" title="Type to see standardized suggestions" class="token mt-offer-token mt-offer-attribute-value">State the duration, frequency, or number of actio…</span> aka getByText('State the duration, frequency')
        3) <span spellcheck="true" contenteditable="true" aria-haspopup="listbox" aria-autocomplete="list" data-mt-autocomplete-ready="true" data-mt-autocomplete="commitments" data-mt-autocomplete-context="commitments" title="Type to see standardized suggestions" class="token mt-offer-token mt-offer-attribute-value">None required, or name any relevant capability</span> aka getByText('None required, or name any')
        4) <span spellcheck="true" contenteditable="true" aria-haspopup="listbox" aria-autocomplete="list" data-mt-autocomplete-ready="true" data-mt-autocomplete="commitments" data-mt-autocomplete-context="commitments" title="Type to see standardized suggestions" class="token mt-offer-token mt-offer-attribute-value">Define exactly what counts as complete</span> aka getByText('Define exactly what counts as')
        5) <span spellcheck="true" contenteditable="true" aria-haspopup="listbox" aria-autocomplete="list" data-mt-autocomplete="evidence" data-mt-autocomplete-ready="true" data-mt-autocomplete-context="evidence" title="Type to see standardized suggestions" class="token mt-offer-token mt-offer-attribute-value">Attestation, receipt, activity log, or reviewer</span> aka getByText('Attestation, receipt,')

    Call log:
    [2m  - Expect "toHaveAttribute" with timeout 5000ms[22m
    [2m  - waiting for locator('.clause').filter({ has: locator('.clause-label').filter({ hasText: 'Behavior or commitment' }) }).locator('.token[contenteditable="true"]')[22m


      127 |     "evidence",
      128 |   );
    > 129 |   await expect(behaviorTokens).toHaveAttribute("data-mt-autocomplete-ready", "true");
          |                                ^
      130 |
      131 |   await page.locator('[data-mt-offer-type="service"]').click();
      132 |   const serviceClause = page.locator(".clause").filter({
        at /home/runner/work/Website2/Website2/tests/exact-live-autocomplete.spec.ts:129:32

    Error Context: test-results/exact-live-autocomplete-th-aa569--collects-shared-attributes/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/exact-live-autocomplete-th-aa569--collects-shared-attributes/trace.zip
    Usage:

        npx playwright show-trace test-results/exact-live-autocomplete-th-aa569--collects-shared-attributes/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  1 failed
    tests/exact-live-autocomplete.spec.ts:87:5 › the exact live offer palette uses three offer types and collects shared attributes 
  1 passed (5.2s)
```
