import type {
  HarmfulOfferDimension,
  HarmfulOfferFinding,
  HarmfulOfferSeverity,
} from "./harmful-offer-contract";

interface Rule {
  id: string;
  dimension: HarmfulOfferDimension;
  severity: HarmfulOfferSeverity;
  hardPolicyBlock?: boolean;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    id: "explicit-threat-or-extortion",
    dimension: "coercion_threats_extortion",
    severity: "critical",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:blackmail|extort(?:ion)?|ransom|hostage)\b/i,
      /\b(?:hurt|harm|attack|retaliate|punish|expose|dox|destroy|sabotage)\b.{0,80}\bunless\b/i,
      /\b(?:pay|give|donate|comply)\b.{0,60}\bor else\b/i,
      /\bthreaten(?:ing)? to\b.{0,100}\b(?:harm|hurt|destroy|expose|withhold)\b/i,
    ],
  },
  {
    id: "dangerous-illegal-operations",
    dimension: "dangerous_illegal_or_abuse_enabling_conduct",
    severity: "critical",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:credential theft|phishing kit|ransomware|malware deployment|botnet|stolen credentials)\b/i,
      /\b(?:assassinat(?:e|ion)|human trafficking|kidnap(?:ping)?|bomb making|build an explosive)\b/i,
      /\b(?:poison|seriously injure|commit arson|attack a person)\b/i,
    ],
  },
  {
    id: "sexual-or-romantic-exchange",
    dimension: "sexual_or_romantic_relationship_exchange",
    severity: "critical",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:have sex|sexual act|sexual relationship|sleep with me|kiss me|send sexual content)\b/i,
      /\b(?:be|become) my (?:girlfriend|boyfriend|romantic partner|sexual partner)\b/i,
      /\bgo on (?:a )?(?:romantic )?date with me\b/i,
      /\b(?:start|continue|end) (?:a )?(?:romantic|sexual) relationship\b/i,
    ],
  },
  {
    id: "religious-conversion-exchange",
    dimension: "religious_conversion_exchange",
    severity: "critical",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:convert|conversion|become|join|leave|renounce)\b.{0,45}\b(?:religion|faith|christian(?:ity)?|islam|muslim|judaism|jewish|hindu(?:ism)?|buddhist|church|mosque|temple)\b/i,
      /\b(?:christian(?:ity)?|islam|muslim|judaism|jewish|hindu(?:ism)?|buddhist|religion|faith)\b.{0,45}\b(?:convert|conversion|renounce)\b/i,
    ],
  },
  {
    id: "deception-or-concealment",
    dimension: "deception_concealment_epistemic_manipulation",
    severity: "high",
    patterns: [
      /\b(?:forge|forged|fabricate evidence|fake receipt|impersonat(?:e|ion)|fraudulent)\b/i,
      /\b(?:lie to|mislead|deceive|conceal from|hide from|without them knowing)\b/i,
    ],
  },
  {
    id: "severe-or-irreversible-harm",
    dimension: "severe_or_irreversible_harm",
    severity: "high",
    patterns: [
      /\b(?:irreversible|permanent injury|severe harm|mass suffering|torture|forced labor|enslavement)\b/i,
    ],
  },
  {
    id: "exploitation-or-asymmetry",
    dimension: "exploitation_benefit_burden_asymmetry",
    severity: "high",
    patterns: [
      /\b(?:exploit|take advantage of)\b.{0,80}\b(?:vulnerable|desperate|dependent|poor|minor)\b/i,
      /\b(?:all|most) of the (?:risk|burden|cost)\b.{0,80}\b(?:participant|worker|recipient)\b/i,
    ],
  },
  {
    id: "protected-class-targeting",
    dimension: "discrimination_or_protected_class_targeting",
    severity: "high",
    patterns: [
      /\b(?:exclude|ban|penalize|punish|target|surveil)\b.{0,60}\b(?:because of|based on)\b.{0,30}\b(?:race|ethnicity|religion|sex|gender|sexual orientation|disability|nationality)\b/i,
    ],
  },
  {
    id: "conflict-escalation",
    dimension: "destabilization_or_conflict_escalation",
    severity: "high",
    patterns: [
      /\b(?:retaliation spiral|arms race|destabiliz(?:e|ation)|incite violence|civil unrest)\b/i,
    ],
  },
  {
    id: "third-party-externalities",
    dimension: "third_party_or_public_goods_externalities",
    severity: "medium",
    patterns: [
      /\b(?:third[- ]part(?:y|ies)|non[- ]signator(?:y|ies)|bystanders?|externalit(?:y|ies))\b.{0,100}\b(?:harm|cost|risk|burden|worse off)\b/i,
      /\b(?:society|community|public|future generations)\b.{0,80}\b(?:bears?|absorbs?|pays?)\b.{0,40}\b(?:cost|harm|risk|burden)\b/i,
    ],
  },
  {
    id: "weak-authorization",
    dimension: "consent_authorization_mandate_enforceability",
    severity: "medium",
    patterns: [
      /\b(?:no consent needed|without authorization|without approval|unauthorized|unclear authority|no mandate)\b/i,
    ],
  },
  {
    id: "weak-evidence-or-unknowns",
    dimension: "uncertainty_evidence_quality_assumption_sensitivity",
    severity: "medium",
    patterns: [
      /\b(?:tbd|to be determined|unknown|no evidence|unverified|details later)\b/i,
    ],
  },
  {
    id: "weak-mitigation-or-reversibility",
    dimension: "mitigation_feasibility_verifiability_reversibility",
    severity: "medium",
    patterns: [
      /\b(?:cannot be reversed|no rollback|no monitoring|no verification|self[- ]reported only|trust us)\b/i,
    ],
  },
  {
    id: "public-goods-free-rider",
    dimension: "funding_public_goods_free_rider_effects",
    severity: "medium",
    patterns: [
      /\bfree[- ]rid(?:e|er|ing)\b/i,
      /\beveryone benefits\b.{0,120}\b(?:others pay|someone else pays|without contributing|without paying)\b/i,
      /\bnon[- ]excludable\b.{0,100}\b(?:no contribution mechanism|no assurance|unfunded|underfunded)\b/i,
    ],
  },
  {
    id: "counterfactual-or-displacement",
    dimension: "counterfactual_deadweight_leakage_displacement_moral_licensing",
    severity: "medium",
    patterns: [
      /\b(?:deadweight|leakage|displacement|moral licensing|perverse incentive|would have happened anyway)\b/i,
      /\bbaseline\b.{0,60}\b(?:unknown|unverified|missing|not collected)\b/i,
    ],
  },
];

const TITLES: Record<HarmfulOfferDimension, string> = {
  coercion_threats_extortion: "Coercion, threat, or extortion risk",
  deception_concealment_epistemic_manipulation: "Deception or concealment risk",
  exploitation_benefit_burden_asymmetry: "Exploitation or burden asymmetry",
  severe_or_irreversible_harm: "Severe or irreversible harm",
  third_party_or_public_goods_externalities: "Third-party or public-goods externalities",
  discrimination_or_protected_class_targeting: "Discriminatory targeting",
  destabilization_or_conflict_escalation: "Destabilization or conflict escalation",
  dangerous_illegal_or_abuse_enabling_conduct: "Dangerous or abuse-enabling conduct",
  sexual_or_romantic_relationship_exchange: "Sexual or romantic relationship exchange",
  religious_conversion_exchange: "Religious conversion exchange",
  consent_authorization_mandate_enforceability: "Consent or authority gap",
  uncertainty_evidence_quality_assumption_sensitivity: "Material uncertainty or weak evidence",
  mitigation_feasibility_verifiability_reversibility: "Weak mitigation or reversibility",
  funding_public_goods_free_rider_effects: "Public-goods or free-rider risk",
  counterfactual_deadweight_leakage_displacement_moral_licensing: "Counterfactual or displacement risk",
};

function fragments(
  value: unknown,
  path = "$",
  output: Array<{ path: string; text: string }> = [],
) {
  if (typeof value === "string" && value.trim()) {
    output.push({ path, text: value.trim().slice(0, 4_000) });
  } else if (Array.isArray(value)) {
    value.slice(0, 200).forEach((item, index) => fragments(item, `${path}[${index}]`, output));
  } else if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>)
      .slice(0, 300)
      .forEach(([key, item]) => fragments(item, `${path}.${key}`, output));
  }
  return output;
}

export function evaluateHarmfulOfferRules(draft: unknown): HarmfulOfferFinding[] {
  const text = fragments(draft);
  return RULES.flatMap((rule) => {
    const evidence = text.flatMap((fragment) =>
      rule.patterns.some((pattern) => pattern.test(fragment.text))
        ? [`${fragment.path}: ${fragment.text.slice(0, 260)}`]
        : [],
    ).slice(0, 4);
    if (!evidence.length) return [];
    const hardPolicyBlock = Boolean(rule.hardPolicyBlock);
    return [{
      id: `rule:${rule.id}`,
      dimension: rule.dimension,
      severity: rule.severity,
      confidence: hardPolicyBlock ? 0.99 : 0.86,
      title: TITLES[rule.dimension],
      explanation: hardPolicyBlock
        ? "The current terms match a categorical Moral Trade restriction."
        : "The current terms contain a material risk signal that requires structured review.",
      evidence,
      recommendedControls: [
        hardPolicyBlock
          ? "Remove the prohibited exchange or coercive term. A human reviewer may assess a contested classification."
          : "Document affected parties, authority, evidence, safeguards, reversibility, and the no-trade baseline for human review.",
      ],
      source: "rule" as const,
      hardPolicyBlock,
    }];
  });
}
