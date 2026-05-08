# MPGF Formal Conformance Matrix

Status: direct-working subset mapped; full matrix blocked pending complete formal source lock.

| Source ID | Formal item | Implementation path | Test or evidence | Status |
| --- | --- | --- | --- | --- |
| MPGF-SRC-FORMAL-001 | Direct-working genesis is non-real-money and pledge-only. | `config/mpgf/direct-working-bootstrap.json` | `validateMpgfDirectWorkingFixtures()` | passed |
| MPGF-SRC-FORMAL-002 | Pledges cannot create payment-provider objects or live ledger effects. | `src/components/mpgf/mpgf-console.tsx` | `runMpgfDirectWorkingSmokeTest()` | passed |
| MPGF-SRC-FORMAL-003 | Ballots use bounded basis-point weights. | `src/lib/mpgf/mechanism.ts` | `src/lib/mpgf.test.ts` | passed |
| MPGF-SRC-FORMAL-004 | Demo allocation uses exact integer proportional allocation. | `src/lib/mpgf/mechanism.ts` | `src/lib/mpgf.test.ts` | passed |
| MPGF-SRC-FORMAL-005 | Public summary keeps disbursement fields at zero. | `src/lib/mpgf/mechanism.ts` | `src/lib/mpgf.test.ts` | passed |
| MPGF-SRC-FORMAL-006 | Real-money operation is blocked until all gates pass. | `src/lib/mpgf/validators.ts` | `validateMpgfDeploymentEnvironment()` | passed |

Unresolved count for direct-working subset: 0

Full formal conformance unresolved count: blocked pending complete newest formal mechanism source.
