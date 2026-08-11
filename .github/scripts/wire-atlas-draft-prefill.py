from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one marker in {path}, found {count}: {old[:160]!r}")
    path.write_text(text.replace(old, new, 1))


synthesis = Path("src/lib/opportunity-synthesis.ts")
replace_once(
    synthesis,
    '''function tokens(value: string) {
''',
    '''export type SynthesizedTradeDraftRole = "first_party" | "counterparty";

export interface SynthesizedTradeDraftPrefill {
  offeredCause: string;
  requestedCause: string;
  proposedAction: string;
  requestedAction: string;
  noTradeBaseline: string;
  duration: string;
  startDate: string;
  evidenceDueDate: string;
  evidenceRule: string;
  maximumBurden: string;
  privacyScope: string;
  exitConditions: string;
  notes: string;
  voluntaryCertification: false;
}

export function isSynthesizedTradeDraftRole(value: string): value is SynthesizedTradeDraftRole {
  return value === "first_party" || value === "counterparty";
}

function draftPrompt(instruction: string, startingPoint?: string) {
  const suggestion = startingPoint?.trim()
    ? ` Suggested starting point: ${startingPoint.trim()}`
    : "";
  return `[Replace: ${instruction}.${suggestion}]`;
}

export function buildSynthesizedTradeDraftPrefill({
  template,
  matchedCause,
  role,
}: {
  template: OpportunitySynthesisTemplate;
  matchedCause: string;
  role: SynthesizedTradeDraftRole;
}): SynthesizedTradeDraftPrefill {
  const priority = matchedCause.trim().replace(/\\s+/g, " ").slice(0, 120) || template.offeredCause;
  const userGives = role === "first_party" ? template.firstPartyGives : template.counterpartyGives;
  const userReceives = role === "first_party" ? template.firstPartyReceives : template.counterpartyReceives;
  const roleLabel = role === "first_party" ? "first-party side" : "counterparty side";
  const classification = synthesisClassificationLabel(template.classification);

  return {
    offeredCause: draftPrompt(
      "name the counterparty's moral priority that your proposed contribution would advance",
    ),
    requestedCause: priority,
    proposedAction: draftPrompt("state your concrete, bounded commitment", userGives),
    requestedAction: draftPrompt(
      "state the counterparty's concrete, bounded reciprocal commitment",
      userReceives,
    ),
    noTradeBaseline: draftPrompt(
      "replace this field-level hypothesis with a dated account of what both sides would actually do without the trade",
      template.noTradeBaseline,
    ),
    duration: draftPrompt("state a bounded duration or completion date"),
    startDate: "",
    evidenceDueDate: "",
    evidenceRule: draftPrompt(
      "specify evidence and an authorized verifier for the binding need, available capacity, additionality, consent, and each completion milestone",
    ),
    maximumBurden: draftPrompt(
      "state a hard cap covering direct cost, management, backfill, recruitment, transition, lost output, legal or administrative cost, and risk",
    ),
    privacyScope:
      "Keep identities, organization-specific bottlenecks, staff availability, internal evidence, and contact details private until every authorized party approves disclosure. Publish only explicitly approved outcome metadata.",
    exitConditions: draftPrompt(
      "state withdrawal, amendment, pause, dispute, and termination rules; withdrawal before terms freeze must carry no reputational penalty",
    ),
    notes: [
      `Generated from Bottleneck Atlas ${BOTTLENECK_ATLAS_VERSION}: ${template.title}.`,
      `Drafting role: ${roleLabel}. Classification hypothesis: ${classification}.`,
      "No named counterparty is confirmed, no consent or authority is inferred, and this draft is not a live offer or agreement.",
      "Do not apply the moral-trade label unless differences in moral priorities materially create the deal and both sides attest to that fact.",
      `Candidate structures: ${template.candidateStructures.join("; ")}.`,
      `Validation questions: ${template.validationQuestions.join(" ")}`,
      `Safety checks: ${template.safetyChecks.join(" ")}`,
    ].join("\\n\\n"),
    voluntaryCertification: false,
  };
}

function tokens(value: string) {
''',
)

test_path = Path("src/lib/opportunity-synthesis.test.ts")
replace_once(
    test_path,
    '''import {
  isOpportunitySynthesisEnabled,
''',
    '''import {
  buildSynthesizedTradeDraftPrefill,
  isOpportunitySynthesisEnabled,
''',
)
replace_once(
    test_path,
    '''  parseSynthesizedOpportunityId,
  synthesizeBottleneckAtlasRecommendations,
} from "./opportunity-synthesis";
''',
    '''  parseSynthesizedOpportunityId,
  synthesizeBottleneckAtlasRecommendations,
} from "./opportunity-synthesis";
import { getSynthesisTemplate } from "./bottleneck-atlas";
''',
)
replace_once(
    test_path,
    '''test("the kill switch is explicit and fail-operational only when not disabled", () => {
''',
    '''test("atlas candidates prefill a private draft without inventing a counterparty or executable terms", () => {
  const template = getSynthesisTemplate("ai-governance-advocacy-operations");
  assert.ok(template);

  const firstParty = buildSynthesizedTradeDraftPrefill({
    template,
    matchedCause: "AI governance",
    role: "first_party",
  });
  const counterparty = buildSynthesizedTradeDraftPrefill({
    template,
    matchedCause: "animal welfare",
    role: "counterparty",
  });

  assert.equal(firstParty.requestedCause, "AI governance");
  assert.equal(counterparty.requestedCause, "animal welfare");
  assert.match(firstParty.proposedAction, /Full backfill/);
  assert.match(counterparty.proposedAction, /Defined transferable capability/);
  assert.match(firstParty.offeredCause, /^\\[Replace:/);
  assert.match(firstParty.noTradeBaseline, /^\\[Replace:/);
  assert.match(firstParty.notes, /No named counterparty is confirmed/);
  assert.match(firstParty.notes, /not a live offer or agreement/);
  assert.equal(firstParty.voluntaryCertification, false);
});

test("the kill switch is explicit and fail-operational only when not disabled", () => {
''',
)

candidate = Path("src/app/suggested-opportunities/[templateId]/page.tsx")
replace_once(
    candidate,
    '''  if (matchedCause) createQuery.set("cause", matchedCause);

  return (
''',
    '''  if (matchedCause) createQuery.set("cause", matchedCause);
  const firstPartyQuery = new URLSearchParams(createQuery);
  firstPartyQuery.set("role", "first_party");
  const counterpartyQuery = new URLSearchParams(createQuery);
  counterpartyQuery.set("role", "counterparty");

  return (
''',
)
replace_once(
    candidate,
    '''            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/trades/new?${createQuery.toString()}`}
              >
                Create a draft from this idea
              </Link>
              <Link className="button button-secondary" href="/feed">
                Return to feed
              </Link>
            </div>
''',
    '''            <p className={styles.matchNote}>
              Choose which side you may represent. Either route creates only a private, editable
              hypothesis with unresolved fields—not an offer or introduction.
            </p>
            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/trades/new?${firstPartyQuery.toString()}`}
              >
                Draft first-party terms
              </Link>
              <Link
                className="button button-secondary"
                href={`/trades/new?${counterpartyQuery.toString()}`}
              >
                Draft counterparty terms
              </Link>
              <Link className="button button-secondary" href="/feed">
                Return to feed
              </Link>
            </div>
''',
)
replace_once(
    candidate,
    '''            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/trades/new?${createQuery.toString()}`}
              >
                Start private draft
              </Link>
              <Link className="button button-secondary" href="/bottleneck-atlas">
                Back to atlas
              </Link>
            </div>
''',
    '''            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/trades/new?${firstPartyQuery.toString()}`}
              >
                Draft first-party terms
              </Link>
              <Link
                className="button button-secondary"
                href={`/trades/new?${counterpartyQuery.toString()}`}
              >
                Draft counterparty terms
              </Link>
              <Link className="button button-secondary" href="/bottleneck-atlas">
                Back to atlas
              </Link>
            </div>
''',
)

create_page = Path("src/app/trades/new/page.tsx")
replace_once(
    create_page,
    '''import { getOfferById, getViewer } from "@/lib/app-data";
''',
    '''import { getOfferById, getViewer } from "@/lib/app-data";
import { getSynthesisTemplate, synthesisClassificationLabel } from "@/lib/bottleneck-atlas";
''',
)
replace_once(
    create_page,
    '''import { getFormMessage } from "@/lib/form-state";
''',
    '''import { getFormMessage } from "@/lib/form-state";
import {
  buildSynthesizedTradeDraftPrefill,
  isSynthesizedTradeDraftRole,
} from "@/lib/opportunity-synthesis";
''',
)
replace_once(
    create_page,
    '''  const templateId = valueOf(resolvedSearchParams.template);
  const structure = valueOf(resolvedSearchParams.structure);
''',
    '''  const templateId = valueOf(resolvedSearchParams.template);
  const synthesisSource = valueOf(resolvedSearchParams.source);
  const synthesizedDraftRequested = synthesisSource === "bottleneck_atlas_synthesis";
  const synthesisCause = valueOf(resolvedSearchParams.cause).trim().slice(0, 120);
  const requestedSynthesisRole = valueOf(resolvedSearchParams.role);
  const synthesisRole = isSynthesizedTradeDraftRole(requestedSynthesisRole)
    ? requestedSynthesisRole
    : "first_party";
  const synthesisTemplate = synthesizedDraftRequested
    ? getSynthesisTemplate(templateId)
    : null;
  const structure = valueOf(resolvedSearchParams.structure);
''',
)
replace_once(
    create_page,
    '''  const sourceOfferId = valueOf(resolvedSearchParams.source_offer);
  const [viewer, sourceOffer] = await Promise.all([
''',
    '''  const sourceOfferId = valueOf(resolvedSearchParams.source_offer);
  if (synthesizedDraftRequested && !synthesisTemplate) {
    return (
      <FeedCreateFailure message="The Bottleneck Atlas template is missing or is not recognized." />
    );
  }
  if (synthesizedDraftRequested && (feedCreateRequested || sourceOfferId)) {
    return (
      <FeedCreateFailure message="A Bottleneck Atlas hypothesis cannot be combined with a live feed source or existing offer." />
    );
  }
  const [viewer, sourceOffer] = await Promise.all([
''',
)
replace_once(
    create_page,
    '''  if (templateId) returnParams.set("template", templateId);
  if (structure) returnParams.set("structure", structure);
''',
    '''  if (templateId) returnParams.set("template", templateId);
  if (synthesizedDraftRequested) {
    returnParams.set("source", "bottleneck_atlas_synthesis");
    if (synthesisCause) returnParams.set("cause", synthesisCause);
    returnParams.set("role", synthesisRole);
  }
  if (structure) returnParams.set("structure", structure);
''',
)
replace_once(
    create_page,
    '''  const templateValues = getPledgeTemplateInitialValues(templateId);
''',
    '''  const synthesizedTemplateValues = synthesisTemplate
    ? buildSynthesizedTradeDraftPrefill({
        template: synthesisTemplate,
        matchedCause: synthesisCause,
        role: synthesisRole,
      })
    : undefined;
  const templateValues =
    synthesizedTemplateValues ?? getPledgeTemplateInitialValues(templateId);
''',
)
replace_once(
    create_page,
    '''  const templateLabel = sourceOffer
    ? `Counteroffer to ${sourceOffer.ownerProfile?.resolvedName ?? sourceOffer.owner_alias}`
    : templateValues
      ? getTradeDraftTemplateLabel(templateId)
      : null;
''',
    '''  const templateLabel = sourceOffer
    ? `Counteroffer to ${sourceOffer.ownerProfile?.resolvedName ?? sourceOffer.owner_alias}`
    : synthesisTemplate
      ? `Bottleneck Atlas hypothesis · ${synthesisClassificationLabel(synthesisTemplate.classification)} · ${
          synthesisRole === "first_party" ? "first-party side" : "counterparty side"
        }`
      : templateValues
        ? getTradeDraftTemplateLabel(templateId)
        : null;
''',
)

wiring = Path("src/bottleneck-atlas-feed-wiring.test.ts")
replace_once(
    wiring,
    '''test("the public atlas and candidate detail routes preserve the hypothesis boundary", () => {
''',
    '''test("atlas suggestions hand off to a private, role-specific, fail-closed draft", () => {
  const detail = read("src/app/suggested-opportunities/[templateId]/page.tsx");
  const create = read("src/app/trades/new/page.tsx");
  assert.match(detail, /role", "first_party"/);
  assert.match(detail, /role", "counterparty"/);
  assert.match(detail, /not an offer or introduction/);
  assert.match(create, /buildSynthesizedTradeDraftPrefill/);
  assert.match(create, /A Bottleneck Atlas hypothesis cannot be combined/);
  assert.match(create, /Bottleneck Atlas hypothesis/);
});

test("the public atlas and candidate detail routes preserve the hypothesis boundary", () => {
''',
)
