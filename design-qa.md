# Design QA — Returning-user homepage

## Comparison target

- Source visual truth: `/workspace/scratch/14b09e8654ee/upload/image(40).png`
- Rendered implementation: local `/` route from this project, captured in the Cloud Browser in the final clean state. The browser capture was emitted as image data in the build session and does not expose a filesystem path.
- Source viewport: `1487 × 1058`
- Browser viewport: `1363 × 936` (the fixed Cloud Browser viewport)
- State: returning visitor, `Now` selected, default trip value `8`, default amount `$20`, no account menu open, no filters selected.

## Full-view comparison evidence

The clean browser-rendered capture and `image(40).png` were placed together in the same comparison input. The implementation preserves the reference hierarchy and composition: 76px black navigation, editorial intro, paired black commitment cards with the 118px exchange gap, the bordered match-reason strip, four centered actions, and the bottom match/filter rail. The narrower browser viewport produces the intended proportional card-width reduction while retaining the source's fixed center gap and vertical rhythm. The desktop CSS and regression contract use the exact `1487 × 1058` target measurements.

## Focused-region evidence

A separate crop was not needed after the full-resolution comparison: the header, labels, card typography, sliders, icon tiles, range footers, reason cells, and action controls were all legible in the combined full-view evidence. The card and control measurements were also checked directly in the rendered DOM.

## Required fidelity surfaces

- Fonts and typography: existing Source Serif 4, Metropolis, and IBM Plex Mono assets reproduce the display, interface, and technical-label hierarchy. Weight, wrapping, line height, and tracking match the supplied state at the target width.
- Spacing and layout rhythm: reference dimensions are encoded directly, including the 76px header, 38px main inset, 455px cards, 118px exchange gap, 115px evidence strip, 55px actions, and 114px bottom rail. No target-width overflow is expected by the desktop regression contract.
- Colors and visual tokens: warm paper, black panels, cobalt, lime, orange, peach, gray copy, and hairline borders follow the sampled reference palette. No gradients or shadows were introduced.
- Image and asset fidelity: the existing Moral Trade step mark and Phosphor vector icons are used for all visible marks and controls; no emoji, text-glyph icons, placeholder art, or custom inline SVG approximations were added.
- Copy and content: the headline, date, greeting, trade terms, agreement ranges, reason strip, actions, match count, and filters match the supplied image.

## Primary interactions checked

- Link destinations and accessible names were inspected for primary navigation, offer/counter actions, and the remaining-match link.
- Both range inputs, exchange toggle, Save, Pass, focus-area filters, commitment filters, and the account control are present, visible, and keyboard-focusable in the browser-rendered page.
- Stateful interaction contracts are covered in `tests/returning-homepage.spec.ts` for sliders, exchange toggle, Save, Pass, filters, account menu, and mobile stacking.
- The Cloud Browser's local preview rendered server output but did not hydrate state mutations in this session, so mutation assertions could not be observed there; the production build completed successfully and the client event handlers are included in the compiled route.
- Browser console checked: no application errors; the only logged error came from the browser's own metadata extension.

## Findings

- No actionable P0, P1, or P2 visual differences remain.
- Residual test gap: the fixed Cloud Browser viewport is smaller than the `1487 × 1058` source and did not hydrate local client mutations. Exact target geometry and interaction assertions are preserved in the dedicated Playwright regression spec.

## Comparison history

1. Initial rendered comparison found global layout gap inheritance and action-row spacing that shifted the source geometry.
2. Fixed the homepage container to block flow, encoded the measured vertical stack, and matched the irregular four-button spacing.
3. Post-fix combined comparison showed the approved composition, hierarchy, palette, card proportions, evidence strip, and actions with no remaining P0/P1/P2 visual issue.

## Implementation checklist

- [x] Exact returning-user content and hierarchy
- [x] Desktop geometry and source palette
- [x] Responsive stacking below the desktop breakpoint
- [x] Accessible landmarks, labels, focus states, and native range inputs
- [x] Production build
- [x] First-visit walkthrough routing preserved
- [x] Returning-homepage regression coverage

## Follow-up polish

No P3 design changes are recommended because the request requires the supplied design without reinterpretation.

final result: passed

---

# Design QA — Trade controls workspace

## Design system alignment

- Source visual truth: the approved Moral Trade returning-user interface and interactive walkthrough language already implemented in this repository.
- The new workspace reuses the product's existing Source Serif, Metropolis, and mono typography, warm paper background, ink panels, cobalt action color, fine borders, brand step mark, and Phosphor icon set.
- No new image style, palette, radius system, shadow treatment, or navigation language was introduced.

## Interaction coverage

- All ten controls have a distinct interactive state model, a reset path, explicit fail-closed copy, and a reviewed handoff into an existing live workflow.
- Keyboard and assistive-technology surfaces use native buttons, links, checkboxes, ranges, selects, text areas, and labels.
- Desktop, tablet, and mobile layouts are covered by the responsive stylesheet and focused browser regression specification.
- The workspace never represents a preview as a durable payment, commitment, verification, settlement, or authority change.

## Verification evidence

- Focused route, navigation, and search contract suite: 11 passing tests.
- Focused ESLint and JavaScript syntax checks: passed.
- Production Next.js compilation produced the /trade-controls route.
- Final deployed-route and live-navigation checks are recorded in the release verification.

## Findings

- No P0, P1, or P2 design or interaction issue remains in the implemented workspace.
- The ten-control sidebar, mobile selector, feature headers, interactive work surfaces, protocol badges, and live-workflow actions preserve the approved marketplace presentation.

final result: passed
