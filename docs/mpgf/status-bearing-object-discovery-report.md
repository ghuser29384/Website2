# MPGF Status-Bearing Object Discovery Report

Status: direct-working discovery complete for the current local implementation.

## Objects Found

| Object | Source | Status field | Registry coverage |
| --- | --- | --- | --- |
| cycle | `src/lib/mpgf/data.ts` | `stage`, `mode`, contribution mode | covered by cycle state machine and status registry |
| candidate alternative | `src/lib/mpgf/data.ts` | `status` | covered by direct-working candidate statuses |
| pledge | `src/lib/mpgf/types.ts` | `status` | covered by pledge-only direct-working statuses |
| public summary | `src/lib/mpgf/types.ts` | publication state external to summary object | covered by public summary state registry |
| validation result | `src/lib/mpgf/types.ts` | `status` | covered by validator status |

## Production Evidence Notes

Persisted database status-bearing objects for the implemented MPGF workflows are covered by the migration set and status registry. Production-domain demo completion still requires authenticated browser evidence for ordinary participant mutations.

Conformance rows: AC-STATE-001, AC-STATE-010.
