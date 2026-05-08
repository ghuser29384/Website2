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

## Blockers

Persisted database status-bearing objects required for full exact-pilot or real-money operation remain blocked until repository migrations and formal source lock pass.

Conformance rows: AC-STATE-001, AC-STATE-010.
