# MPGF Conformance Matrix

Status: passed for direct-working demo scope

| Acceptance ID | Source ID / locator | Implementation path | Evidence | Status |
| --- | --- | --- | --- | --- |
| AC-NORMALIZATION-014 | Build Instruction section 0 | docs/mpgf/codex-build-instruction-final.md | canonical materialized file | passed |
| AC-REPO-001 | Build Instruction section 10 | docs/mpgf/repository-capability-inventory.md | inventory document and JSON | passed |
| AC-SCHEMA-018 | MPGF-SRC-FORMAL-001 | config/mpgf/direct-working-bootstrap.json | non-real-money genesis bootstrap config | passed |
| AC-SCHEMA-019 | MPGF-SRC-FORMAL-002 | src/components/mpgf/mpgf-console.tsx | pledge-only UI and mechanism | passed |
| AC-PAYMENT-020 | MPGF-SRC-FORMAL-002 | src/lib/mpgf/mechanism.ts | pledge-only recurring commitments with no provider objects | passed |
| AC-LEDGER-016 | Build Instruction section 13 | config/mpgf/ledger-template-registry.json | ledger template validator | passed |
| AC-SOLVER-001 | MPGF-SRC-FORMAL-004 | src/lib/mpgf/mechanism.ts | exact integer proportional allocation | passed |
| AC-UI-001 | Build Instruction section 46 | src/app/mpgf | public route tree renders non-real-money state | passed |
| AC-UI-004 | Build Instruction section 46 | src/lib/mpgf/validators.ts | runMpgfDirectWorkingSmokeTest | passed |
| AC-COMPLETION-010 | Build Instruction section 45 | docs/mpgf/direct-working-smoke-test.md | direct-working smoke-test evidence | passed |

Unresolved count: 0
