**Comparison Target**

- Source visual truth: `/workspace/scratch/0bf6f64a0da1/upload/e80c76eb341876f659f8b36475bfaccf.png`
- Browser-rendered implementation: `/workspace/scratch/evidence-viewer-desktop-final-20260721.jpg`
- Route: `/evidence/example`
- Browser viewport: `1363 × 936` CSS pixels at DPR 1
- Compared state: Evidence tab, first receipt selected, 100% zoom, privacy dialog closed
- Normalization: both 1,290 × 852 dossier interiors were cropped at native scale before comparison.
- Full-view comparison: `/tmp/moraltrade-design-comparison.jpg`
- Focused right-pane comparison: `/tmp/moraltrade-right-pane-comparison.jpg`

**Findings**

- No actionable P0, P1, or P2 visual differences remain.
- The implementation preserves the source's 1,290 × 852 sheet, 35/65 split, inset frame, warm paper palette, serif/sans/monospace hierarchy, nearly square controls, evidence toolbar, centered artifact, filmstrip, submitter/file metadata, verification rail, and bottom actions.
- Dynamic demo content produces different line wrapping than the transit example, as expected. The layout remains stable and scrollable rather than truncating the real agreement.
- The “Illustrative” badge is an intentional truthfulness addition for the non-live example. It does not displace the source hierarchy.

**Required Fidelity Surfaces**

- Fonts and typography: passed. Existing site heading/body/mono tokens reproduce the reference's editorial, interface, and audit-label hierarchy. Real names and obligations wrap without clipping.
- Spacing and layout rhythm: passed. Sheet/frame dimensions, divider position, tabs, 64px artifact toolbar, dominant evidence canvas, filmstrip/metadata split, and action row align with the normalized reference.
- Colors and visual tokens: passed. Warm whites, neutral matte, charcoal ink, fine gray dividers, restrained green state accents, amber example label, and red challenge states are semantically mapped.
- Image quality and asset fidelity: passed. The evidence photos are real raster assets at 1536 × 1024 and render sharply with contained crops. Phosphor icons provide a consistent thin-stroke family. The receipt remains selectable text rather than a fake screenshot.
- Copy and content: passed. Copy is trade-specific and truthfully distinguishes submission, counterparty acceptance, challenge, privacy redaction, and independent verification.
- Accessibility and interaction: passed for the target desktop route. Tabs use tab semantics, the evidence canvas supports arrow-key selection, artifacts expose pressed/current state, native dialogs are labelled, focus styles remain visible, and controls use practical targets.

**Comparison History**

- Iteration 1 findings: the first implementation review found hidden required-vs-optional mapping, overly broad green/check semantics, a brittle mobile zoom offset, incomplete routed-page modal semantics, small metadata text, an example notice overlapping the toolbar, and participant-only records that could 404.
- Iteration 1 fixes: artifact group and limits were exposed; submitted/accepted/challenged tones were separated; mobile zoom became a normal toolbar row; the routed screen became a labelled section; dialog labels and metadata sizing were corrected; the example state became an inline badge; participant-only records now authorize participants and render a restricted dossier.
- Iteration 2 findings: the first browser render showed the receipt shrink-wrapped too narrowly and privacy details could remain below a retained metadata scroll position.
- Iteration 2 fixes: the zoom target now fills the canvas, matching the reference's artifact width; vertical canvas padding was removed; privacy moved above detailed mapping; and metadata scroll resets on artifact change.
- Post-fix evidence: the full-view and focused right-pane comparison images above show the corrected sheet, canvas, filmstrip, metadata, and action geometry with no remaining P0/P1/P2 mismatch.

**Primary Interactions Tested**

- Selected receipt and photo artifacts; `aria-pressed` and the evidence-preview label updated.
- Switched Evidence, Trade terms, and Verification tabs; selected semantics and panel content updated.
- Opened and closed Privacy details; redaction state, hidden fields, viewer scope, and privacy rule were present.
- Zoomed to 125% and reset to 100%.
- Used ArrowRight and ArrowLeft on the focused evidence canvas to change artifacts.
- Browser console checked: no viewer runtime error. The only local messages were the cloud-browser extension's metadata warning and the expected missing local Supabase-auth environment message; neither originates in this component or appears in the configured production environment.

**Implementation Checklist**

- [x] Match the desktop dossier composition and visual tokens.
- [x] Preserve real evidence, terms, verification, privacy, and review interactions.
- [x] Cover awaiting-evidence and participant-only agreement states.
- [x] Validate source contracts, lint, and browser interactions.
- [x] Recompare the corrected browser render against the source at native dossier scale.

**Follow-up Polish**

- P3: the Next.js development issue badge touches the bottom-left of the local capture. It is development-only and is absent from production.

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
