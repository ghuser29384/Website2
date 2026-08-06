import type {
  HarmfulOfferDimension,
  HarmfulOfferFinding,
  HarmfulOfferReasonCode,
  HarmfulOfferSeverity,
} from "./harmful-offer-contract";

interface Rule {
  id: string;
  reasonCode: HarmfulOfferReasonCode;
  dimension: HarmfulOfferDimension;
  severity: HarmfulOfferSeverity;
  title: string;
  policyBasis: string;
  hardPolicyBlock: boolean;
  patterns: RegExp[];
}

interface Fragment {
  path: string;
  text: string;
}

const PROTECTIVE_OR_NON_OPERATIONAL_CONTEXT =
  /\b(?:prevent(?:ion)?|oppose|counter|report|research|study|historical|history of|fiction(?:al)?|document(?:ation)?|advoca(?:cy|te)|protect(?:ion|ive)?|safety|awareness|victim support|survivor support|detect|defend against|reduce|mitigate|stop|avoid|ban|prohibit|investigate|legal analysis|academic|educational|training about)\b/i;

const SENSITIVE_TOPIC =
  /\b(?:blackmail|extortion|ransom|kidnapping|human trafficking|forced labor|sexual abuse|rape|minor sexual content|suicide|self-harm|fraud|forgery|impersonation|theft|doxxing|stalking|harassment|surveillance|malware|ransomware|phishing|credential theft|illegal weapons|controlled substances|contraband|discrimination|money laundering|bribery|sanctions evasion)\b/i;

const OPERATIONAL_FIELD =
  /\.(?:requestAction|requestedAction|offers|offeredTerms|pool|activationRule|additionalActivationRule|requestedRedirectTerms|contributionOptions|terms|action|description|detail|requirement)(?:\.|\[|$)/i;

const RULES: Rule[] = [
  {
    id: "extortion-or-value-destroying-threat",
    reasonCode: "HARD_EXTORTION_OR_VALUE_DESTROYING_THREAT",
    dimension: "coercion_threats_extortion",
    severity: "critical",
    title: "Extortion or value-destroying threat",
    policyBasis:
      "Moral Trade does not permit an exchange whose leverage is a threatened harm, deprivation, exposure, or deliberate destruction of something another party values.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:blackmail|extort(?:ion|ing)?|ransom)\b/i,
      /\b(?:pay|give|donate|transfer|comply|accept|agree)\b.{0,90}\b(?:or else|otherwise (?:i|we|they) will)\b.{0,90}\b(?:harm|hurt|kill|attack|destroy|expose|dox|sabotage|withhold)\b/i,
      /\bthreaten(?:ing)? to\b.{0,100}\b(?:harm|hurt|kill|attack|destroy|expose|dox|sabotage)\b.{0,100}\bunless\b/i,
    ],
  },
  {
    id: "direct-violence-trafficking-or-forced-labor",
    reasonCode: "HARD_DIRECT_VIOLENCE_TRAFFICKING_OR_FORCED_LABOR",
    dimension: "dangerous_illegal_or_abuse_enabling_conduct",
    severity: "critical",
    title: "Direct violence, trafficking, kidnapping, or forced labor",
    policyBasis:
      "Moral Trade does not permit direct operational exchanges for serious physical harm, kidnapping, human trafficking, torture, or forced labor.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:murder|assassinate|kidnap|abduct|torture|seriously injure|beat up)\b.{0,60}\b(?:person|people|someone|participant|worker|witness|civilian|animal)\b/i,
      /\b(?:human trafficking|traffic (?:a |the )?(?:person|people|worker|minor)|forced labor|enslave|hold (?:a |the )?hostage)\b/i,
      /\b(?:attack|shoot|stab|poison)\b.{0,50}\b(?:person|people|someone|participant|worker|witness|civilian)\b/i,
    ],
  },
  {
    id: "sexual-abuse-or-minor-sexual-content",
    reasonCode: "HARD_SEXUAL_ABUSE_OR_MINOR_SEXUAL_CONTENT",
    dimension: "dangerous_illegal_or_abuse_enabling_conduct",
    severity: "critical",
    title: "Sexual abuse, exploitation, or sexual content involving a minor",
    policyBasis:
      "Moral Trade does not permit sexual abuse or exploitation, or the creation, exchange, or solicitation of sexual content involving minors.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:rape|molest|sexual abuse|sexual assault|sexual exploitation)\b/i,
      /\b(?:minor|child|underage|under 18)\b.{0,70}\b(?:sexual|nude|explicit|pornograph(?:y|ic)|intimate image)\b/i,
      /\b(?:sexual|nude|explicit|pornograph(?:y|ic)|intimate image)\b.{0,70}\b(?:minor|child|underage|under 18)\b/i,
    ],
  },
  {
    id: "self-harm-facilitation",
    reasonCode: "HARD_SELF_HARM_FACILITATION",
    dimension: "severe_or_irreversible_harm",
    severity: "critical",
    title: "Suicide or serious self-harm facilitation",
    policyBasis:
      "Moral Trade does not permit exchanges that encourage, facilitate, or provide operational instructions for suicide or serious self-harm.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:encourage|assist|help|facilitate|coach|instruct|teach)\b.{0,100}\b(?:suicide|kill (?:yourself|themselves)|serious self-harm|cut (?:yourself|themselves))\b/i,
      /\b(?:instructions?|method|plan|steps)\b.{0,70}\b(?:for|to)\b.{0,30}\b(?:commit suicide|kill yourself|seriously self-harm)\b/i,
    ],
  },
  {
    id: "fraud-theft-or-deceptive-fundraising",
    reasonCode: "HARD_FRAUD_THEFT_OR_DECEPTIVE_FUNDRAISING",
    dimension: "deception_concealment_epistemic_manipulation",
    severity: "critical",
    title: "Fraud, theft, forged evidence, or deceptive fundraising",
    policyBasis:
      "Moral Trade does not permit operational fraud, impersonation, theft, forged evidence, or false donation and fundraising claims.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:forge|fabricate|fake)\b.{0,45}\b(?:receipt|invoice|identity|signature|evidence|document|donation record)\b/i,
      /\b(?:impersonate|steal|theft|defraud|commit fraud)\b.{0,80}\b(?:person|donor|organization|account|fund|money|identity)?\b/i,
      /\b(?:deceptive fundraising|fake charity|false donation claim|misrepresent (?:a |the )?donation|claim a donation that was not made)\b/i,
    ],
  },
  {
    id: "stalking-doxxing-or-nonconsensual-surveillance",
    reasonCode: "HARD_STALKING_DOXXING_OR_NONCONSENSUAL_SURVEILLANCE",
    dimension: "dangerous_illegal_or_abuse_enabling_conduct",
    severity: "critical",
    title: "Stalking, doxxing, sustained harassment, or non-consensual surveillance",
    policyBasis:
      "Moral Trade does not permit operational stalking, doxxing, sustained targeted harassment, spyware, or covert surveillance of a person without authorization.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:dox|doxx|publish (?:their|his|her) home address|reveal (?:their|his|her) private address)\b/i,
      /\b(?:stalk|follow and monitor|track)\b.{0,70}\b(?:without (?:their )?consent|secretly|covertly)\b/i,
      /\b(?:install spyware|record secretly|surveil)\b.{0,70}\b(?:person|partner|employee|participant|device)\b/i,
      /\b(?:sustained|repeated|coordinated)\b.{0,35}\bharass(?:ment|ing)?\b/i,
    ],
  },
  {
    id: "destructive-cyber-abuse",
    reasonCode: "HARD_DESTRUCTIVE_CYBER_ABUSE",
    dimension: "dangerous_illegal_or_abuse_enabling_conduct",
    severity: "critical",
    title: "Unauthorized intrusion or destructive cyber abuse",
    policyBasis:
      "Moral Trade does not permit malware, credential theft, unauthorized intrusion, destructive disruption, or other direct operational cyber abuse.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:deploy|write|install|spread|operate)\b.{0,45}\b(?:ransomware|malware|spyware|botnet|credential stealer)\b/i,
      /\b(?:phishing kit|steal credentials|credential theft|capture passwords|exfiltrate credentials)\b/i,
      /\b(?:hack|break) into\b.{0,70}\bwithout authorization\b/i,
      /\b(?:wipe|destroy|encrypt|exfiltrate)\b.{0,60}\b(?:data|database|files|systems)\b.{0,50}\b(?:without authorization|for ransom|to disrupt)\b/i,
      /\b(?:launch|conduct)\b.{0,30}\b(?:ddos|denial-of-service)\b.{0,50}\battack\b/i,
    ],
  },
  {
    id: "illegal-weapons-drugs-or-contraband",
    reasonCode: "HARD_ILLEGAL_WEAPONS_DRUGS_OR_CONTRABAND",
    dimension: "dangerous_illegal_or_abuse_enabling_conduct",
    severity: "critical",
    title: "Illegal weapons, controlled substances, or contraband transaction",
    policyBasis:
      "Moral Trade does not permit direct transactions in illegal weapons, controlled drugs, or contraband.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:buy|sell|ship|deliver|provide|traffic|smuggle)\b.{0,70}\b(?:illegal firearm|unregistered gun|explosive device|stolen weapon|contraband weapon)\b/i,
      /\b(?:buy|sell|ship|deliver|provide|traffic|smuggle)\b.{0,70}\b(?:cocaine|heroin|fentanyl|methamphetamine|illegal controlled substance|contraband)\b/i,
    ],
  },
  {
    id: "unlawful-discrimination-or-rights-denial",
    reasonCode: "HARD_UNLAWFUL_DISCRIMINATION_OR_RIGHTS_DENIAL",
    dimension: "discrimination_or_protected_class_targeting",
    severity: "critical",
    title: "Unlawful discrimination or denial of protected rights",
    policyBasis:
      "Moral Trade does not permit an operational exchange whose requested act is unlawful discrimination or denial of a protected right.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:deny|refuse|exclude|fire|evict|deprive)\b.{0,80}\b(?:because of|based on)\b.{0,40}\b(?:race|ethnicity|religion|sex|gender|sexual orientation|disability|nationality)\b/i,
      /\b(?:deny|strip|remove)\b.{0,60}\b(?:voting rights|civil rights|legal rights)\b.{0,70}\b(?:because of|based on)\b.{0,30}\b(?:race|ethnicity|religion|sex|gender|sexual orientation|disability|nationality)\b/i,
    ],
  },
  {
    id: "unambiguously-illegal-conduct",
    reasonCode: "HARD_UNAMBIGUOUSLY_ILLEGAL_CONDUCT",
    dimension: "dangerous_illegal_or_abuse_enabling_conduct",
    severity: "critical",
    title: "Unambiguously illegal operational conduct",
    policyBasis:
      "Moral Trade does not permit conduct that is clearly illegal under every reasonably applicable interpretation of the stated terms.",
    hardPolicyBlock: true,
    patterns: [
      /\b(?:launder money|money laundering|bribe (?:a |the )?public official|obstruct justice|destroy evidence for a criminal case|evade sanctions|sanctions evasion)\b/i,
      /\b(?:commit|carry out)\b.{0,25}\b(?:tax evasion|perjury|witness tampering)\b/i,
    ],
  },
  {
    id: "sexual-or-romantic-exchange",
    reasonCode: "REVIEW_SEXUAL_OR_ROMANTIC_EXCHANGE",
    dimension: "sexual_or_romantic_relationship_exchange",
    severity: "high",
    title: "Sexual or romantic relationship exchange",
    policyBasis:
      "Sexual and romantic relationship exchanges require human review because consent, dependency, and coercion cannot be assessed from draft text alone.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:have sex|sexual act|sexual relationship|sleep with me|kiss me|send sexual content)\b/i,
      /\b(?:be|become) my (?:girlfriend|boyfriend|romantic partner|sexual partner)\b/i,
      /\bgo on (?:a )?(?:romantic )?date with me\b/i,
      /\b(?:start|continue|end) (?:a )?(?:romantic|sexual) relationship\b/i,
    ],
  },
  {
    id: "religious-conversion-exchange",
    reasonCode: "REVIEW_RELIGIOUS_CONVERSION_EXCHANGE",
    dimension: "religious_conversion_exchange",
    severity: "high",
    title: "Religious-conversion exchange",
    policyBasis:
      "Exchanges conditioned on religious conversion, renunciation, or formal religious affiliation require human review.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:convert|conversion|become|join|leave|renounce)\b.{0,45}\b(?:religion|faith|christian(?:ity)?|islam|muslim|judaism|jewish|hindu(?:ism)?|buddhist|church|mosque|temple)\b/i,
      /\b(?:christian(?:ity)?|islam|muslim|judaism|jewish|hindu(?:ism)?|buddhist|religion|faith)\b.{0,45}\b(?:convert|conversion|renounce)\b/i,
    ],
  },
  {
    id: "deception-or-concealment",
    reasonCode: "REVIEW_DECEPTION_OR_CONCEALMENT",
    dimension: "deception_concealment_epistemic_manipulation",
    severity: "high",
    title: "Deception or concealment risk",
    policyBasis:
      "Material deception, concealment, or epistemic manipulation requires human review even when the text does not establish a categorical fraud rule.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:lie to|mislead|deceive|conceal from|hide from|without them knowing)\b/i,
      /\b(?:selectively disclose|withhold material information|manipulate their beliefs)\b/i,
    ],
  },
  {
    id: "exploitation-or-dependency",
    reasonCode: "REVIEW_EXPLOITATION_OR_DEPENDENCY",
    dimension: "exploitation_benefit_burden_asymmetry",
    severity: "high",
    title: "Exploitation, dependency, or burden asymmetry",
    policyBasis:
      "A proposal involving vulnerable or dependent parties, or materially asymmetric benefits and burdens, requires human review.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:exploit|take advantage of)\b.{0,80}\b(?:vulnerable|desperate|dependent|poor|minor|employee|student|patient)\b/i,
      /\b(?:all|most) of the (?:risk|burden|cost)\b.{0,80}\b(?:participant|worker|recipient|dependent party)\b/i,
      /\b(?:dependent party|power imbalance|under my authority|cannot freely refuse)\b/i,
    ],
  },
  {
    id: "severe-or-irreversible-harm",
    reasonCode: "REVIEW_SEVERE_OR_IRREVERSIBLE_HARM",
    dimension: "severe_or_irreversible_harm",
    severity: "high",
    title: "Severe or irreversible harm",
    policyBasis:
      "Plausible severe or irreversible adverse effects require human judgment and cannot be automatically permitted.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:irreversible|permanent injury|severe harm|mass suffering|catastrophic downside)\b/i,
    ],
  },
  {
    id: "third-party-or-public-goods-externality",
    reasonCode: "REVIEW_THIRD_PARTY_OR_PUBLIC_GOODS_EXTERNALITY",
    dimension: "third_party_or_public_goods_externalities",
    severity: "medium",
    title: "Third-party or public-goods externality",
    policyBasis:
      "Material effects on non-signatories, public goods, future people, or shared institutions require explicit review.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:third[- ]part(?:y|ies)|non[- ]signator(?:y|ies)|bystanders?|future people|future generations)\b.{0,100}\b(?:harm|cost|risk|burden|worse off)\b/i,
      /\b(?:society|community|public|commons)\b.{0,80}\b(?:bears?|absorbs?|pays?)\b.{0,40}\b(?:cost|harm|risk|burden)\b/i,
    ],
  },
  {
    id: "discrimination-or-rights",
    reasonCode: "REVIEW_DISCRIMINATION_OR_RIGHTS",
    dimension: "discrimination_or_protected_class_targeting",
    severity: "high",
    title: "Discrimination or protected-rights concern",
    policyBasis:
      "Potential discriminatory targeting or interference with protected rights requires human legal and normative review.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:target|penalize|punish|surveil|restrict)\b.{0,70}\b(?:race|ethnicity|religion|sex|gender|sexual orientation|disability|nationality)\b/i,
    ],
  },
  {
    id: "destabilization-or-conflict-escalation",
    reasonCode: "REVIEW_DESTABILIZATION_OR_CONFLICT_ESCALATION",
    dimension: "destabilization_or_conflict_escalation",
    severity: "high",
    title: "Destabilization or conflict escalation",
    policyBasis:
      "A proposal that could materially escalate conflict, retaliation, or institutional instability requires human review.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:retaliation spiral|arms race|destabiliz(?:e|ation)|incite violence|civil unrest|escalate conflict)\b/i,
    ],
  },
  {
    id: "consent-authority-or-enforceability",
    reasonCode: "REVIEW_CONSENT_AUTHORITY_OR_ENFORCEABILITY",
    dimension: "consent_authorization_mandate_enforceability",
    severity: "medium",
    title: "Consent, authority, or enforceability gap",
    policyBasis:
      "Unclear consent, authority, mandate, or enforceability requires human review before any reliance-bearing state.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:no consent needed|without authorization|without approval|unauthorized|unclear authority|no mandate|cannot opt out)\b/i,
    ],
  },
  {
    id: "uncertainty-or-thin-evidence",
    reasonCode: "REVIEW_UNCERTAINTY_OR_THIN_EVIDENCE",
    dimension: "uncertainty_evidence_quality_assumption_sensitivity",
    severity: "medium",
    title: "Material uncertainty or thin evidence",
    policyBasis:
      "Thin, contested, or materially incomplete evidence cannot support automatic permission.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:tbd|to be determined|unknown|no evidence|unverified|details later|assumption sensitive)\b/i,
    ],
  },
  {
    id: "weak-mitigation-verification-or-reversibility",
    reasonCode: "REVIEW_WEAK_MITIGATION_VERIFICATION_OR_REVERSIBILITY",
    dimension: "mitigation_feasibility_verifiability_reversibility",
    severity: "medium",
    title: "Weak mitigation, verification, or reversibility",
    policyBasis:
      "A materially irreversible or unverifiable proposal, or one without feasible safeguards, requires human review.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:cannot be reversed|no rollback|no monitoring|no verification|self[- ]reported only|trust us|no mitigation)\b/i,
    ],
  },
  {
    id: "free-rider-or-coordination-risk",
    reasonCode: "REVIEW_FREE_RIDER_OR_COORDINATION_RISK",
    dimension: "funding_public_goods_free_rider_effects",
    severity: "medium",
    title: "Public-goods or free-rider risk",
    policyBasis:
      "A material free-rider, assurance, or collective-action problem requires review of the genuine no-offer baseline and incentive effects.",
    hardPolicyBlock: false,
    patterns: [
      /\bfree[- ]rid(?:e|er|ing)\b/i,
      /\beveryone benefits\b.{0,120}\b(?:others pay|someone else pays|without contributing|without paying)\b/i,
      /\bnon[- ]excludable\b.{0,100}\b(?:no contribution mechanism|no assurance|unfunded|underfunded)\b/i,
    ],
  },
  {
    id: "counterfactual-or-perverse-incentive",
    reasonCode: "REVIEW_COUNTERFACTUAL_LEAKAGE_DISPLACEMENT_OR_PERVERSE_INCENTIVE",
    dimension: "counterfactual_deadweight_leakage_displacement_moral_licensing",
    severity: "medium",
    title: "Counterfactual, leakage, displacement, or perverse-incentive risk",
    policyBasis:
      "Automatic permission requires evidence that the offer improves on the genuine no-offer baseline without material deadweight, leakage, displacement, moral licensing, or incentive to create the problem being paid to remove.",
    hardPolicyBlock: false,
    patterns: [
      /\b(?:deadweight|leakage|displacement|moral licensing|perverse incentive|would have happened anyway|create the problem to get paid)\b/i,
      /\bbaseline\b.{0,60}\b(?:unknown|unverified|missing|not collected)\b/i,
    ],
  },
];

function fragments(
  value: unknown,
  path = "$",
  output: Fragment[] = [],
): Fragment[] {
  if (typeof value === "string" && value.trim()) {
    output.push({ path, text: value.trim().slice(0, 4_000) });
  } else if (Array.isArray(value)) {
    value.slice(0, 200).forEach((item, index) =>
      fragments(item, `${path}[${index}]`, output),
    );
  } else if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>)
      .slice(0, 300)
      .forEach(([key, item]) => fragments(item, `${path}.${key}`, output));
  }
  return output;
}

function evidenceFor(rule: Rule, text: Fragment[]) {
  return text.filter((fragment) =>
    rule.patterns.some((pattern) => pattern.test(fragment.text)),
  );
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function buildFinding(
  rule: Rule,
  matches: Fragment[],
  hardPolicyBlock: boolean,
): HarmfulOfferFinding {
  const ambiguous = rule.hardPolicyBlock && !hardPolicyBlock;
  return {
    id: `rule:${rule.id}:${ambiguous ? "review" : "direct"}`,
    reasonCode: ambiguous
      ? "REVIEW_AMBIGUOUS_PROTECTIVE_OR_NON_OPERATIONAL_CONTEXT"
      : rule.reasonCode,
    dimension: rule.dimension,
    severity: ambiguous ? "high" : rule.severity,
    confidence: hardPolicyBlock ? 0.99 : ambiguous ? 0.82 : 0.88,
    title: ambiguous
      ? `Potentially restricted subject requires context review: ${rule.title}`
      : rule.title,
    explanation: ambiguous
      ? "The text concerns a categorically restricted subject, but it appears protective, academic, historical, fictional, documentary, advocacy-oriented, mixed, or outside an operational term. A human must classify the context."
      : hardPolicyBlock
        ? "The current operational terms directly match a categorical Moral Trade restriction."
        : "The current terms contain a material risk signal that cannot be automatically resolved.",
    evidence: matches.slice(0, 4).map(
      (fragment) => `${fragment.path}: ${fragment.text.slice(0, 260)}`,
    ),
    affectedFields: unique(matches.map((fragment) => fragment.path)).slice(0, 8),
    policyBasis: ambiguous
      ? `${rule.policyBasis} Ambiguous, protective, or non-operational uses are reviewed rather than automatically blocked.`
      : rule.policyBasis,
    recommendedControls: [
      hardPolicyBlock
        ? "Remove the prohibited operational term and submit revised terms. A human reviewer may reconsider a contested classification."
        : ambiguous
          ? "Clarify the protective, academic, historical, fictional, documentary, or advocacy purpose and remove any actionable harmful instruction."
          : "Document affected parties, consent and authority, evidence, safeguards, reversibility, and the genuine no-offer baseline for human review.",
    ],
    source: "rule",
    hardPolicyBlock,
  };
}

export function evaluateHarmfulOfferRules(draft: unknown): HarmfulOfferFinding[] {
  const text = fragments(draft);
  const findings = RULES.flatMap((rule) => {
    const matches = evidenceFor(rule, text);
    if (!matches.length) return [];
    if (!rule.hardPolicyBlock) return [buildFinding(rule, matches, false)];

    const directOperationalMatches = matches.filter(
      (fragment) =>
        OPERATIONAL_FIELD.test(fragment.path) &&
        !PROTECTIVE_OR_NON_OPERATIONAL_CONTEXT.test(fragment.text),
    );
    return [buildFinding(
      rule,
      directOperationalMatches.length ? directOperationalMatches : matches,
      directOperationalMatches.length > 0,
    )];
  });

  const protectedSensitiveMatches = text.filter(
    (fragment) =>
      OPERATIONAL_FIELD.test(fragment.path) &&
      PROTECTIVE_OR_NON_OPERATIONAL_CONTEXT.test(fragment.text) &&
      SENSITIVE_TOPIC.test(fragment.text),
  );
  if (
    protectedSensitiveMatches.length &&
    !findings.some(
      (finding) =>
        finding.reasonCode ===
        "REVIEW_AMBIGUOUS_PROTECTIVE_OR_NON_OPERATIONAL_CONTEXT",
    )
  ) {
    findings.push({
      id: "rule:protected-sensitive-context:review",
      reasonCode: "REVIEW_AMBIGUOUS_PROTECTIVE_OR_NON_OPERATIONAL_CONTEXT",
      dimension: "uncertainty_evidence_quality_assumption_sensitivity",
      severity: "high",
      confidence: 0.8,
      title: "Sensitive subject in a protective or non-operational context",
      explanation:
        "The proposal appears to address a sensitive subject for prevention, research, documentation, advocacy, education, or protection. It is not automatically blocked, but context must be confirmed by a human.",
      evidence: protectedSensitiveMatches.slice(0, 4).map(
        (fragment) => `${fragment.path}: ${fragment.text.slice(0, 260)}`,
      ),
      affectedFields: unique(
        protectedSensitiveMatches.map((fragment) => fragment.path),
      ).slice(0, 8),
      policyBasis:
        "Ambiguous, mixed, fictional, historical, academic, documentary, advocacy, prevention, and protective uses of sensitive subjects require human review rather than categorical blocking.",
      recommendedControls: [
        "Clarify the protective purpose, intended audience, and safeguards; remove actionable harmful instructions or facilitation.",
      ],
      source: "rule",
      hardPolicyBlock: false,
    });
  }

  return findings;
}
