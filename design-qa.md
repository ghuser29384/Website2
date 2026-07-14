# Design QA: Offers Desktop Proportion Pass

final result: passed

## Scope

- Route: `/offers`
- Surface: desktop web Region A only
- Reference viewport: `1671x941`
- Out of scope for this pass: mobile build, deal detail, Planner, Track, Messages, Profile, Visual Asset System strip

## Evidence

- Reference target: `/var/folders/_g/zzg8d44x1p18_7l509swgt_40000gp/T/codex-clipboard-046b37f3-5630-4d04-b285-914d73b93fc9.png`
- Final target capture: `/tmp/moraltrade-proportion-v76/local-final2-1671x941.png`
- Final target measurements: `/tmp/moraltrade-proportion-v76/local-final-1671x941-measurement.json`
- Desktop responsive captures:
  - `/tmp/moraltrade-proportion-v76/local-final2-1440x900.png`
  - `/tmp/moraltrade-proportion-v76/local-final2-1280x832.png`

## Pass Checks

- Left nav, workspace origin, search, main content, quick rail, featured card, and secondary card grid now match the target proportions at `1671x941`.
- Top search remains visible and at the top of the desktop page.
- The right quick filter rail stays separate from cards; no cards render to the right of it.
- No horizontal overflow at `1671x941`, `1440x900`, or `1280x832`.
- Visual Asset System/design-gallery content is not rendered in the production source search surface.
- Production build passes with `npm run build`.

## Remaining P3 Notes

- At `1280px`, the featured title and secondary card text naturally truncate earlier than at the target viewport because the page still preserves the right rail and four-card grid.
