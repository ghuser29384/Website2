export type AtlasCluster =
  | "Frontier and catastrophic risks"
  | "Global health and development"
  | "Animals, food, and climate"
  | "Epistemic and scientific infrastructure";

export type AtlasSensitivity = "standard" | "elevated" | "restricted";

export interface AtlasSource {
  label: string;
  organization: string;
  url: string;
  evidenceType:
    | "strategy"
    | "annual_report"
    | "funding_request"
    | "vacancy"
    | "request_for_proposals"
    | "funder_assessment"
    | "technical_report";
}

export interface BottleneckAtlasField {
  id: string;
  name: string;
  cluster: AtlasCluster;
  summary: string;
  primaryBottlenecks: readonly string[];
  transferableAssets: readonly string[];
  tradeImplication: string;
  confidence: number;
  sensitivity: AtlasSensitivity;
  aliases: readonly string[];
  sources: readonly AtlasSource[];
}

export type SynthesisClassification =
  | "moral_trade_hypothesis"
  | "mixed_moral_trade_hypothesis"
  | "operational_exchange"
  | "moral_public_good_coordination";

export type SynthesisActorScope =
  | "individual"
  | "researcher"
  | "team"
  | "organization"
  | "funder"
  | "coalition";

export interface OpportunitySynthesisTemplate {
  id: string;
  title: string;
  summary: string;
  classification: SynthesisClassification;
  actorScopes: readonly SynthesisActorScope[];
  triggerTerms: readonly string[];
  sourceFieldIds: readonly string[];
  offeredCause: string;
  requestedCause: string;
  firstPartyGives: string;
  firstPartyReceives: string;
  counterpartyGives: string;
  counterpartyReceives: string;
  noTradeBaseline: string;
  candidateStructures: readonly string[];
  validationQuestions: readonly string[];
  safetyChecks: readonly string[];
  confidence: number;
  sensitivity: AtlasSensitivity;
  evidenceLabel: string;
  generic?: boolean;
}

export const BOTTLENECK_ATLAS_VERSION = "2026-08-11.v1";
export const BOTTLENECK_ATLAS_REVIEWED_AT = "2026-08-11";

export const BOTTLENECK_ATLAS_FIELDS = [
  {
    id: "technical-ai-safety",
    name: "Technical AI safety and evaluations",
    cluster: "Frontier and catastrophic risks",
    summary:
      "The strongest recurring constraints are specialized research and engineering capacity, evaluation throughput, secure access to frontier systems, compute, and senior research management—not generic labor.",
    primaryBottlenecks: [
      "Senior machine-learning, security, evaluations, and research talent",
      "Evaluation throughput and secure frontier-model access",
      "Compute and secure research infrastructure",
      "Experienced research management and grantmaking absorptive capacity",
    ],
    transferableAssets: [
      "Flexible funding and unusually strong compensation capacity",
      "Compute, model access, security practices, and evaluation protocols",
      "Technical mentorship and access to frontier-AI institutions",
    ],
    tradeImplication:
      "The field should usually purchase scarce specialist capability rather than generic researchers. The most transferable outside capabilities are security engineering, high-reliability verification, research operations, program management, and forecasting.",
    confidence: 92,
    sensitivity: "restricted",
    aliases: ["AI safety", "AI alignment", "model evaluations", "frontier AI", "AI security"],
    sources: [
      {
        label: "Measuring AI ability to complete long tasks",
        organization: "METR",
        url: "https://metr.org/time-horizons/",
        evidenceType: "technical_report",
      },
      {
        label: "GCR grantmakers and senior generalists",
        organization: "Coefficient Giving",
        url: "https://coefficientgiving.org/gcr-grantmakers-and-senior-generalists/",
        evidenceType: "funder_assessment",
      },
    ],
  },
  {
    id: "ai-governance",
    name: "AI governance and policy",
    cluster: "Frontier and catastrophic risks",
    summary:
      "Policy organizations repeatedly need experienced policy leadership, jurisdiction-specific knowledge, government relationships, communications, operations, program management, and the capacity to convert research into policy engagement.",
    primaryBottlenecks: [
      "Experienced policy, government, and jurisdiction-specific talent",
      "Operations, communications, research management, and program management",
      "Stakeholder relationships and policy-engagement execution",
      "Funder review and field-building capacity",
    ],
    transferableAssets: [
      "Technical AI analysis and policy-relevant research",
      "Access to AI laboratories, technical institutes, and specialist funders",
      "Funding for backfilled secondments and shared hires",
    ],
    tradeImplication:
      "Mature advocacy organizations may be better counterparties than technical research groups: coalition management, corporate campaigns, policymaker outreach, communications, and program operations are genuinely transferable.",
    confidence: 92,
    sensitivity: "elevated",
    aliases: ["AI governance", "AI policy", "technology policy", "frontier AI policy"],
    sources: [
      {
        label: "Applied fellowship and in-demand roles",
        organization: "Centre for the Governance of AI",
        url: "https://www.governance.ai/post/winter-fellowship-2027-applied-track",
        evidenceType: "vacancy",
      },
    ],
  },
  {
    id: "digital-minds",
    name: "AI welfare and potential digital minds",
    cluster: "Frontier and catastrophic risks",
    summary:
      "This emerging field lacks mature operational indicators of possible sentience and welfare, interdisciplinary empirical work, model access, academic homes, legal and policy frameworks, and a durable career pipeline.",
    primaryBottlenecks: [
      "Foundational consciousness and welfare science",
      "Operational indicators and empirical studies",
      "Interdisciplinary researchers, academic legitimacy, and career pathways",
      "Model access, compute, legal analysis, and policy translation",
    ],
    transferableAssets: [
      "AI expertise, model access, compute, and experimental environments",
      "Emerging philanthropic capital and access to AI-policy institutions",
      "Technical engineering support for welfare-relevant experiments",
    ],
    tradeImplication:
      "Animal sentience, comparative cognition, welfare-indicator design, affective-state measurement, and precaution under uncertainty are unusually relevant counterpart capabilities, while direct transfer assumptions must remain unproven.",
    confidence: 84,
    sensitivity: "elevated",
    aliases: ["digital minds", "AI welfare", "machine consciousness", "digital sentience"],
    sources: [
      {
        label: "Research and applied work on digital minds",
        organization: "Longview Philanthropy",
        url: "https://www.longview.org/request-for-proposals-research-and-applied-work-on-digital-minds/",
        evidenceType: "request_for_proposals",
      },
    ],
  },
  {
    id: "biosecurity",
    name: "Biosecurity and pandemic preparedness",
    cluster: "Frontier and catastrophic risks",
    summary:
      "Detection systems are frequently constrained by physical samples, cold chain, laboratory operations, metadata and LIMS systems, government integration, product translation, trial infrastructure, manufacturing pathways, and regulatory coordination.",
    primaryBottlenecks: [
      "Representative sample access, transport, cold chain, and metadata quality",
      "Laboratory operations, LIMS, and government-public-health integration",
      "Preclinical-to-clinical translation, therapeutics, and trial infrastructure",
      "Manufacturing, regulatory coordination, and diversified R&D capital",
    ],
    transferableAssets: [
      "Biosurveillance technology, biological-risk analysis, and software engineering",
      "Philanthropic capital for dual-use laboratory and logistics infrastructure",
      "National-security attention and specialized quality-assurance methods",
    ],
    tradeImplication:
      "Biosecurity funders can finance laboratory, logistics, and data-system upgrades in exchange for implementation access and trusted country networks, but agreements must guarantee routine-health value, local ownership, consent, and strict data governance.",
    confidence: 94,
    sensitivity: "restricted",
    aliases: ["biosecurity", "pandemic preparedness", "pathogen detection", "biosurveillance"],
    sources: [
      {
        label: "Detection-system logistics role",
        organization: "SecureBio",
        url: "https://securebio.org/careers/2026-logistics-manager/",
        evidenceType: "vacancy",
      },
    ],
  },
  {
    id: "global-health-rd-amr",
    name: "Global health R&D and antimicrobial resistance",
    cluster: "Global health and development",
    summary:
      "The constraint is not only discovery funding. Clinical development, manufacturing, registration, diagnostics, surveillance, predictable demand, procurement, distribution, access planning, and stewardship all determine whether products reach patients.",
    primaryBottlenecks: [
      "Early and later-stage product-development financing",
      "Clinical development, manufacturing, CMC, and regulatory registration",
      "Diagnostics, surveillance, procurement, and predictable demand",
      "Distribution, evidence for appropriate use, access planning, and stewardship",
    ],
    transferableAssets: [
      "Product-development, clinical, regulatory, and manufacturing expertise",
      "Government, health-system, and procurement relationships",
      "Introduction planning and access-oriented implementation capability",
    ],
    tradeImplication:
      "Useful exchanges connect pipeline capital and products to trial sites, registration, procurement, stewardship, and delivery capacity; discovery-only grants leave later bottlenecks untouched.",
    confidence: 95,
    sensitivity: "elevated",
    aliases: ["AMR", "antimicrobial resistance", "global health R&D", "antibiotics"],
    sources: [
      {
        label: "2025 annual report and portfolio momentum",
        organization: "CARB-X",
        url: "https://carb-x.org/carb-x-news/carb-x-releases-2025-annual-report-highlighting-portfolio-momentum-and-new-funding/",
        evidenceType: "annual_report",
      },
      {
        label: "Access to antibiotics",
        organization: "GARDP",
        url: "https://gardp.org/access-to-antibiotics/",
        evidenceType: "strategy",
      },
    ],
  },
  {
    id: "nuclear-risk",
    name: "Nuclear risk, security, and nonproliferation",
    cluster: "Frontier and catastrophic risks",
    summary:
      "Safeguards and security depend on diplomatic and member-state access, inspectors and technical experts, monitoring equipment, cybersecurity, insider-threat protection, legal and regulatory systems, supply-chain security, training, and sustained finance.",
    primaryBottlenecks: [
      "Diplomatic access, safeguards inspectors, and technical experts",
      "Monitoring equipment, cybersecurity, and insider-threat protection",
      "Regulatory and legal systems, supply-chain security, and training",
      "Sustained finance and emergency-response capability",
    ],
    transferableAssets: [
      "High-reliability verification and safeguards expertise",
      "Adversarial security culture and internationally recognized legitimacy",
      "Complex monitoring and compliance methods",
    ],
    tradeImplication:
      "There may be value in carefully sanitized collaboration with AI-evaluation and cybersecurity teams, but classification, information hazards, export controls, and false-positive costs make this a restricted-track opportunity.",
    confidence: 91,
    sensitivity: "restricted",
    aliases: ["nuclear security", "nuclear risk", "nonproliferation", "safeguards"],
    sources: [
      {
        label: "International conference analysis on nuclear security",
        organization: "International Atomic Energy Agency",
        url: "https://www-pub.iaea.org/MTCD/Publications/PDF/PUB2067_web.pdf",
        evidenceType: "technical_report",
      },
    ],
  },
  {
    id: "catastrophic-resilience-food",
    name: "Global catastrophic resilience and resilient food systems",
    cluster: "Frontier and catastrophic risks",
    summary:
      "The field needs flexible research funding, real-world pilots, supplier and government integration, logistics and procurement data, emergency exercises, and inclusion in existing contingency plans.",
    primaryBottlenecks: [
      "Flexible and diversified funding for exploratory research",
      "Real-world pilots and government policy adoption",
      "Food-industry, industrial-supplier, logistics, and procurement relationships",
      "Emergency exercises and integration into contingency plans",
    ],
    transferableAssets: [
      "Extreme-scenario modeling and resilient-food engineering",
      "Cross-system risk analysis and catastrophe-specific contingency design",
      "Research agendas for abrupt food-production shocks",
    ],
    tradeImplication:
      "The strongest counterparties are actors with warehousing, food procurement, government access, emergency exercises, or national supply-chain data—not another research institute with similar access gaps.",
    confidence: 76,
    sensitivity: "elevated",
    aliases: ["resilient foods", "catastrophic resilience", "food security", "ALLFED"],
    sources: [
      {
        label: "2025–2026 organizational strategy",
        organization: "ALLFED",
        url: "https://allfed.info/images/pdfs/ALLFED%202025%20-%202026%20Organizational%20Strategy.pdf",
        evidenceType: "strategy",
      },
    ],
  },
  {
    id: "global-health-delivery",
    name: "Global health delivery",
    cluster: "Global health and development",
    summary:
      "Marginal opportunities may require bridge or flexible capital, local staffing, commodity procurement, operational continuity, ministry relationships, monitoring, adaptive management, and the ability to absorb rapid funding increases.",
    primaryBottlenecks: [
      "Bridge and flexible capital",
      "Local staffing, operational continuity, and absorptive capacity",
      "Commodity procurement, warehousing, transport, and last-mile logistics",
      "Government relationships, monitoring, and adaptive management",
    ],
    transferableAssets: [
      "Country staff, field-delivery systems, community trust, and ministry relationships",
      "Monitoring systems, procurement, logistics, and implementation know-how",
      "Durable operational presence with option value for new programs",
    ],
    tradeImplication:
      "Technical fields with a plausible intervention but weak local access can finance delivery capacity in exchange for implementation pathways, provided the host system receives durable routine-service benefits.",
    confidence: 92,
    sensitivity: "elevated",
    aliases: ["global health", "health delivery", "malaria", "public health implementation"],
    sources: [
      {
        label: "Increasing 2026 allocation to GiveWell recommendations",
        organization: "Coefficient Giving",
        url: "https://coefficientgiving.org/research/increasing-our-2026-allocation-to-givewells-recommendations-to-1-billion/",
        evidenceType: "funder_assessment",
      },
    ],
  },
  {
    id: "state-capacity",
    name: "Economic growth, governance, and state capacity",
    cluster: "Global health and development",
    summary:
      "The binding constraint is often implementation: internal analytical capacity, usable administrative systems, cross-ministry coordination, procurement, timely budgets, evidence-use incentives, and durable local ownership.",
    primaryBottlenecks: [
      "Internal government analytical and implementation capacity",
      "Usable administrative data systems and evidence-use incentives",
      "Cross-ministry coordination, procurement, and timely budget execution",
      "Durable local ownership rather than short-term external consultancy",
    ],
    transferableAssets: [
      "Government embedding, administrative data, and policymaker access",
      "Procurement systems and political-context knowledge",
      "Durable channels for implementing multiple cause-specific modules",
    ],
    tradeImplication:
      "Cause-specific funders can finance generally useful ministry capability in exchange for locally owned integration of lead, air-quality, biosecurity, animal-welfare, or health modules into normal government processes.",
    confidence: 91,
    sensitivity: "elevated",
    aliases: ["state capacity", "economic growth", "governance", "government capacity"],
    sources: [
      {
        label: "Data in government in developing countries",
        organization: "International Growth Centre",
        url: "https://www.theigc.org/blogs/data-in-government-developing-countries",
        evidenceType: "technical_report",
      },
    ],
  },
  {
    id: "lead-exposure",
    name: "Lead exposure",
    cluster: "Global health and development",
    summary:
      "Progress requires representative exposure measurement, laboratory and analyzer capacity, source attribution, product testing, regulation and enforcement, manufacturer reformulation, supply-chain remediation, and sustained government ownership.",
    primaryBottlenecks: [
      "Representative blood-lead measurement and laboratory capacity",
      "Source attribution and product testing",
      "Government regulation, market surveillance, and enforcement",
      "Manufacturer reformulation and supply-chain remediation",
    ],
    transferableAssets: [
      "Sampling protocols, product-testing systems, and regulatory templates",
      "Government and manufacturer-engagement methods",
      "Source-remediation and environmental-health implementation expertise",
    ],
    tradeImplication:
      "Lead programs can share laboratories, sampling, surveillance, and enforcement infrastructure with air quality, food safety, and maternal-and-child-health programs.",
    confidence: 94,
    sensitivity: "elevated",
    aliases: ["lead exposure", "lead poisoning", "environmental health"],
    sources: [
      {
        label: "SCALE initiative",
        organization: "Pure Earth",
        url: "https://www.pureearth.org/scale-initiative/",
        evidenceType: "strategy",
      },
    ],
  },
  {
    id: "air-quality",
    name: "Air quality",
    cluster: "Global health and development",
    summary:
      "Monitoring, reference-grade calibration, source attribution, local technical capacity, lead-agency coordination, enforcement, costed project pipelines, and the conversion of pollution evidence into finance remain major constraints.",
    primaryBottlenecks: [
      "Philanthropic and public finance for monitoring and implementation",
      "Reference-grade calibration, monitoring coverage, and source attribution",
      "Local technical capacity, lead-agency coordination, and enforcement",
      "Investment-ready project pipelines that convert evidence into action",
    ],
    transferableAssets: [
      "Sensor networks, open-source calibration tools, and atmospheric modeling",
      "Health-and-climate evidence and city relationships",
      "Measurement systems useful to climate and public-health funders",
    ],
    tradeImplication:
      "Climate finance and health-delivery organizations can jointly support monitoring and implementation: climate actors gain mitigation evidence, health actors gain morbidity reductions, and air-quality teams gain capital and delivery channels.",
    confidence: 96,
    sensitivity: "standard",
    aliases: ["air quality", "air pollution", "clean air", "particulate matter"],
    sources: [
      {
        label: "Philanthropic foundation funding for clean air",
        organization: "Clean Air Fund",
        url: "https://www.cleanairfund.org/resource/philanthropic-foundation-funding-2026/",
        evidenceType: "funder_assessment",
      },
    ],
  },
  {
    id: "farmed-animal-welfare",
    name: "Farmed-animal welfare",
    cluster: "Animals, food, and climate",
    summary:
      "Organizations vary substantially, but recurring needs include unrestricted multiyear funding, country-level staff, corporate accountability, implementation of commitments, policy advocacy, verification, and aquatic-welfare technology.",
    primaryBottlenecks: [
      "Unrestricted and multiyear funding at organizations with usable capacity",
      "Country-level staff and mature campaign management",
      "Corporate accountability and conversion of commitments into implementation",
      "Policy advocacy, measurement, verification, and aquatic-welfare technology",
    ],
    transferableAssets: [
      "Corporate campaigns, coalition coordination, and distributed international networks",
      "Accountability systems, public communications, and institutional procurement",
      "Issue-advocacy operations and corporate-engagement methods",
    ],
    tradeImplication:
      "The field's most transferable capability is generally policy operations, coalition management, communications, corporate engagement, and procurement—not generic scientific research.",
    confidence: 92,
    sensitivity: "standard",
    aliases: ["animal welfare", "farmed animals", "factory farming", "corporate campaigns"],
    sources: [
      {
        label: "Recommended Charity Fund distributions",
        organization: "Animal Charity Evaluators",
        url: "https://animalcharityevaluators.org/donate/donor-resources/recommended-charity-fund/past-distributions/",
        evidenceType: "funder_assessment",
      },
    ],
  },
  {
    id: "wild-animal-welfare",
    name: "Wild-animal and invertebrate welfare",
    cluster: "Animals, food, and climate",
    summary:
      "The field remains foundational: welfare measurement, experienced principal investigators, academic legitimacy, ecological data, intervention development, donor diversification, and flexible research funding are all scarce.",
    primaryBottlenecks: [
      "Foundational welfare science and measurement",
      "Experienced principal investigators and academic legitimacy",
      "Ecological field data and intervention development",
      "Donor diversification and flexible research funding",
    ],
    transferableAssets: [
      "Welfare-indicator methods and comparative cognition",
      "Ecological field-study design and research-agenda formation",
      "Experience building academic legitimacy for neglected welfare questions",
    ],
    tradeImplication:
      "This is a strong scientific counterpart for digital-minds research and a possible partner for conservation organizations with ecological data but no direct welfare optimization objective.",
    confidence: 91,
    sensitivity: "standard",
    aliases: ["wild animal welfare", "invertebrate welfare", "animal sentience", "welfare biology"],
    sources: [
      {
        label: "Annual report",
        organization: "Wild Animal Initiative",
        url: "https://www.wildanimalinitiative.org/annual-report",
        evidenceType: "annual_report",
      },
    ],
  },
  {
    id: "alternative-proteins",
    name: "Alternative proteins and food transition",
    cluster: "Animals, food, and climate",
    summary:
      "Precompetitive R&D, sensory quality, cost, scale-up, pilot infrastructure, interdisciplinary food-science talent, industry uptake, regulation, patient capital, and credible demand are recurring bottlenecks.",
    primaryBottlenecks: [
      "Precompetitive open R&D and interdisciplinary food-science talent",
      "Sensory quality, cost reduction, scale-up, and pilot infrastructure",
      "Industry uptake, regulatory pathways, and patient risk capital",
      "Demand formation, institutional procurement, and offtake commitments",
    ],
    transferableAssets: [
      "Food-science expertise and open technical research",
      "Manufacturer relationships and product-development knowledge",
      "Products that can jointly advance animal and climate objectives",
    ],
    tradeImplication:
      "The pivotal exchange is often an advance-purchase or procurement commitment, not another conventional grant: credible demand can finance scale-up and convert technical work into displacement.",
    confidence: 93,
    sensitivity: "standard",
    aliases: ["alternative protein", "plant-based", "cultivated meat", "food transition"],
    sources: [
      {
        label: "Research grants",
        organization: "Good Food Institute",
        url: "https://gfi.org/researchgrants/",
        evidenceType: "request_for_proposals",
      },
    ],
  },
  {
    id: "climate-clean-energy",
    name: "Climate, clean energy, and carbon removal",
    cluster: "Animals, food, and climate",
    summary:
      "The most important constraints are often project creation and deployment: durable policy, siting, permitting, transmission, skilled workers, supply chains, community legitimacy, early-commercial finance, demand, procurement, standards, and MRV.",
    primaryBottlenecks: [
      "Policy durability, project creation, siting, permitting, and transmission",
      "Skilled workers, supply chains, and community legitimacy",
      "Early-commercial and project finance",
      "Demand formation, procurement, offtake, standards, and measurement",
    ],
    transferableAssets: [
      "Mature policy coalitions, project finance, and procurement models",
      "Community engagement, standards, MRV, and deployment machinery",
      "Large corporate and governmental networks",
    ],
    tradeImplication:
      "Climate's most transferable contribution to other fields is often institutional machinery—policy coalitions, finance, procurement, standards, community engagement, and deployment—rather than generic donations.",
    confidence: 94,
    sensitivity: "standard",
    aliases: ["climate", "clean energy", "carbon removal", "decarbonization"],
    sources: [
      {
        label: "How we work with effective climate charities",
        organization: "Founders Pledge",
        url: "https://www.founderspledge.com/news/how-we-work-with-the-world-s-most-effective-climate-charities",
        evidenceType: "funder_assessment",
      },
    ],
  },
  {
    id: "forecasting",
    name: "Forecasting and decision science",
    cluster: "Epistemic and scientific infrastructure",
    summary:
      "Forecasting organizations need senior research, data, question design, domain evidence, outcome resolution, and integration into decisions with identified owners, deadlines, and consequences.",
    primaryBottlenecks: [
      "Senior researchers, data analysis, and LLM forecasting talent",
      "Question formulation and credible outcome resolution",
      "Domain data and expert access",
      "Integration into live decisions with authority and deadlines",
    ],
    transferableAssets: [
      "Calibrated probabilities, aggregation, question design, and backtesting",
      "Automated forecasting tools and decision-trigger design",
      "Cross-domain scenario analysis",
    ],
    tradeImplication:
      "Forecasting teams may need decision access and outcome labels more than another general grant. Counterparties can supply live decisions, nonpublic data, domain experts, and implementation authority.",
    confidence: 86,
    sensitivity: "elevated",
    aliases: ["forecasting", "decision science", "prediction", "scenario analysis"],
    sources: [
      {
        label: "Research program and careers",
        organization: "Forecasting Research Institute",
        url: "https://forecastingresearch.org/",
        evidenceType: "strategy",
      },
    ],
  },
  {
    id: "effective-giving-careers",
    name: "Effective giving, careers, and incubation",
    cluster: "Epistemic and scientific infrastructure",
    summary:
      "Talent programs are often constrained by diversified funding, senior career-transition support, mentors, placement capacity, incubation, and grantmaking staff, while some GCR funders have capital but insufficient people to deploy it well.",
    primaryBottlenecks: [
      "Diversified funding for talent and career-transition programs",
      "Senior mentors, work trials, placement, and retention capacity",
      "Incubation and project-identification capacity",
      "Grantmaking staff and senior generalists in capital-rich programs",
    ],
    transferableAssets: [
      "Recruitment, screening, career advising, and incubation",
      "Donor access, grant capital, evaluation, and convening",
      "Cross-cause placement and talent-conversion machinery",
    ],
    tradeImplication:
      "This is a clear capital-versus-talent-conversion asymmetry: a funder can finance a cross-cause pipeline and supply work trials, while the talent organization sources, screens, supports, and tracks candidates.",
    confidence: 93,
    sensitivity: "standard",
    aliases: ["effective careers", "talent pipeline", "incubation", "effective giving"],
    sources: [
      {
        label: "Updates on effective giving and careers",
        organization: "Coefficient Giving",
        url: "https://coefficientgiving.org/research/updates-on-open-philanthropys-effective-giving-and-careers-program/",
        evidenceType: "funder_assessment",
      },
      {
        label: "GCR grantmakers and senior generalists",
        organization: "Coefficient Giving",
        url: "https://coefficientgiving.org/gcr-grantmakers-and-senior-generalists/",
        evidenceType: "funder_assessment",
      },
    ],
  },
  {
    id: "metascience",
    name: "Metascience and scientific infrastructure",
    cluster: "Epistemic and scientific infrastructure",
    summary:
      "Missing tools, platforms, datasets, measurement systems, roadmaps, entrepreneurial scientific leadership, sustained team engineering, shared operations, and demand mechanisms prevent many scientific public goods from being built.",
    primaryBottlenecks: [
      "Missing tools, platforms, datasets, and measurement infrastructure",
      "Project roadmapping and entrepreneurial scientific leadership",
      "Sustained team engineering and shared operations",
      "Market pull, adoption commitments, standards, and demand building",
    ],
    transferableAssets: [
      "Roadmapping, organization formation, and shared governance",
      "Open technical infrastructure and coordinated engineering",
      "Cross-disciplinary convening and reusable operations",
    ],
    tradeImplication:
      "Focused infrastructure organizations can build common tools in exchange for domain organizations supplying use cases, testbeds, field data, specialist personnel, and adoption commitments.",
    confidence: 92,
    sensitivity: "standard",
    aliases: ["metascience", "scientific infrastructure", "research infrastructure", "FRO"],
    sources: [
      {
        label: "Focused Research Organizations",
        organization: "Convergent Research",
        url: "https://www.convergentresearch.org/about",
        evidenceType: "strategy",
      },
    ],
  },
] as const satisfies readonly BottleneckAtlasField[];

export const OPPORTUNITY_SYNTHESIS_TEMPLATES = [
  {
    id: "digital-minds-animal-welfare-science",
    title: "Digital-minds and animal-welfare science bridge",
    summary:
      "A digital-minds project could fund and technically support a bounded joint research program while animal-welfare scientists contribute welfare-indicator, comparative-cognition, and precautionary methodology.",
    classification: "mixed_moral_trade_hypothesis",
    actorScopes: ["researcher", "team", "organization", "funder"],
    triggerTerms: [
      "digital minds",
      "AI welfare",
      "machine consciousness",
      "animal welfare",
      "animal sentience",
      "wild animal welfare",
    ],
    sourceFieldIds: ["digital-minds", "wild-animal-welfare", "farmed-animal-welfare"],
    offeredCause: "Digital-mind welfare research",
    requestedCause: "Animal welfare and sentience science",
    firstPartyGives: "Model access, compute, AI engineering, and full project funding",
    firstPartyReceives: "Welfare indicators, comparative methods, experimental design, and scientific mentorship",
    counterpartyGives: "Bounded scientific collaboration with explicit backfill and authorship terms",
    counterpartyReceives: "Full opportunity-cost coverage plus an unrestricted mission contribution",
    noTradeBaseline:
      "The digital-minds project proceeds with weaker welfare methodology, while the animal-welfare team keeps all research capacity in its existing agenda.",
    candidateStructures: [
      "Twelve-month jointly supervised fellowship",
      "Small joint laboratory with preregistered studies",
      "Methodology workshops plus limited consulting and unrestricted side payment",
    ],
    validationQuestions: [
      "Which methods genuinely transfer, rather than merely sounding analogous?",
      "What research would each side otherwise conduct?",
      "Will model access, compute, publication, and data rights be adequate?",
      "Does the source team retain at least its counterfactual core output?",
    ],
    safetyChecks: [
      "Do not present animal welfare indicators as validated digital-sentience tests.",
      "Separate empirical observations from philosophical assumptions.",
      "Review information hazards and model-access restrictions.",
    ],
    confidence: 83,
    sensitivity: "elevated",
    evidenceLabel: "Strong methodological overlap; specific transferability remains unconfirmed.",
  },
  {
    id: "biosecurity-global-health-delivery",
    title: "Biosecurity detection and global-health delivery compact",
    summary:
      "A biosecurity funder could finance dual-use sample, cold-chain, laboratory, and data infrastructure while an embedded health organization supplies implementation networks and government integration.",
    classification: "mixed_moral_trade_hypothesis",
    actorScopes: ["organization", "funder"],
    triggerTerms: [
      "biosecurity",
      "pandemic preparedness",
      "pathogen detection",
      "global health",
      "public health",
      "health delivery",
    ],
    sourceFieldIds: ["biosecurity", "global-health-delivery", "global-health-rd-amr"],
    offeredCause: "Scalable pathogen detection",
    requestedCause: "Trusted health-delivery and laboratory implementation",
    firstPartyGives: "Capital, detection technology, training, and quality assurance",
    firstPartyReceives: "Sample streams, field logistics, public-health context, and government integration",
    counterpartyGives: "Implementation capacity and governed access under local authority",
    counterpartyReceives: "Durable routine-health infrastructure and full operating support",
    noTradeBaseline:
      "The detection project lacks representative field access, while the health implementer lacks capital for laboratory and logistics upgrades.",
    candidateStructures: [
      "Dual-use infrastructure grant with a routine-health benefit floor",
      "Time-limited pilot with local data governance and response exercises",
      "Triangular funder–technology–implementation compact",
    ],
    validationQuestions: [
      "What routine-health value remains if no novel pathogen is found?",
      "Who owns samples, metadata, analyses, and escalation decisions?",
      "Is clinic and laboratory workload fully funded?",
      "Are national authorities and affected communities genuine decision-makers?",
    ],
    safetyChecks: [
      "Mandatory specialist review for biosafety, privacy, consent, and national-security risk.",
      "No extractive sample or data arrangement.",
      "No live introduction before jurisdiction, authority, and security checks pass.",
    ],
    confidence: 76,
    sensitivity: "restricted",
    evidenceLabel: "High complementarity; unusually high legal, security, and governance burden.",
  },
  {
    id: "forecasting-live-decisions",
    title: "Forecasting for live decision access",
    summary:
      "A forecasting team could design and maintain calibrated forecasts in exchange for a real decision, internal evidence, domain experts, an accountable decision owner, and outcome-resolution data.",
    classification: "operational_exchange",
    actorScopes: ["individual", "researcher", "team", "organization", "funder"],
    triggerTerms: [
      "forecasting",
      "decision science",
      "AI safety",
      "biosecurity",
      "global health",
      "nuclear risk",
      "animal welfare",
      "climate",
    ],
    sourceFieldIds: ["forecasting"],
    offeredCause: "Better high-stakes decisions",
    requestedCause: "Decision access, domain evidence, and outcome resolution",
    firstPartyGives: "Question design, forecasts, aggregation, calibration, and decision thresholds",
    firstPartyReceives: "A live decision, domain access, feedback, and resolution evidence",
    counterpartyGives: "Decision ownership, internal data, domain experts, and implementation authority",
    counterpartyReceives: "Decision-linked analysis rather than an open-ended forecasting report",
    noTradeBaseline:
      "The forecasting team produces less decision-relevant work, while the decision owner acts without a calibrated external probability process.",
    candidateStructures: [
      "Preregistered decision-linked forecast contract",
      "Forecast tournament tied to named decision thresholds",
      "Embedded forecasting sprint with post-decision audit",
    ],
    validationQuestions: [
      "Which decision can the forecast actually change?",
      "Who has authority to act, and by what deadline?",
      "What thresholds map to which actions?",
      "How will partial or delayed resolution be handled?",
    ],
    safetyChecks: [
      "Do not publish sensitive forecasts by default.",
      "Record false-positive and false-negative costs.",
      "Do not claim impact merely because probabilities were produced.",
    ],
    confidence: 88,
    sensitivity: "elevated",
    evidenceLabel: "Clear deliverables and relatively strong pilotability when a real decision owner exists.",
  },
  {
    id: "gcr-funder-talent-pipeline",
    title: "GCR funder and cross-cause talent pipeline",
    summary:
      "A capital-rich GCR funder could finance a cross-cause talent program and supply work trials, while a careers organization sources, screens, supports, places, and tracks senior candidates.",
    classification: "moral_trade_hypothesis",
    actorScopes: ["organization", "funder"],
    triggerTerms: [
      "AI safety",
      "biosecurity",
      "GCR",
      "effective careers",
      "talent pipeline",
      "incubation",
    ],
    sourceFieldIds: ["effective-giving-careers", "technical-ai-safety", "biosecurity"],
    offeredCause: "More high-quality GCR grantmaking and operations",
    requestedCause: "Cross-cause talent sourcing, transition, and placement",
    firstPartyGives: "Multiyear funding, mentors, work trials, compensation support, and hiring feedback",
    firstPartyReceives: "Screened senior candidates and retained placement capacity",
    counterpartyGives: "Recruitment, screening, transition support, placement, and retention monitoring",
    counterpartyReceives: "Full program funding and a protected parallel track for another cause",
    noTradeBaseline:
      "The funder remains people-constrained, while the talent organization cannot finance enough senior transitions or diversified cause tracks.",
    candidateStructures: [
      "Multiyear cross-cause placement grant",
      "Shared work-trial and mentor network",
      "GCR-funded tranche with a protected animal-welfare or global-health track",
    ],
    validationQuestions: [
      "Which roles are actually blocked by candidate scarcity?",
      "What proportion of placements are counterfactual and retained after twelve months?",
      "Does the arrangement crowd talent out of less-funded causes?",
      "Do candidates retain informed autonomy over cause and role choice?",
    ],
    safetyChecks: [
      "Do not treat people as allocable organizational assets.",
      "Measure source-field crowd-out and retention.",
      "Require transparent candidate consent and compensation.",
    ],
    confidence: 79,
    sensitivity: "standard",
    evidenceLabel: "Explicit capital-versus-senior-talent asymmetry; placement quality must be verified.",
  },
  {
    id: "alternative-protein-procurement",
    title: "Alternative-protein procurement compact",
    summary:
      "Technical teams, animal advocates, climate funders, and institutional purchasers could coordinate R&D, advance demand, and procurement so that scale-up is financed by credible displacement-oriented offtake.",
    classification: "moral_public_good_coordination",
    actorScopes: ["team", "organization", "funder", "coalition"],
    triggerTerms: [
      "alternative protein",
      "animal welfare",
      "factory farming",
      "climate",
      "food transition",
      "procurement",
    ],
    sourceFieldIds: ["alternative-proteins", "farmed-animal-welfare", "climate-clean-energy"],
    offeredCause: "Scalable lower-animal-use food",
    requestedCause: "R&D, procurement, and credible offtake",
    firstPartyGives: "Open R&D, product prototypes, supplier qualification, and scale-up plans",
    firstPartyReceives: "Advance demand, pilot capital, procurement access, and displacement evidence",
    counterpartyGives: "Conditional purchase commitments, campaign access, climate finance, and evaluation",
    counterpartyReceives: "Products meeting cost, quality, nutrition, welfare, and emissions thresholds",
    noTradeBaseline:
      "Technical work stalls before scale, advocates lack procurement-ready products, and purchasers wait for a mature market that never forms.",
    candidateStructures: [
      "Conditional advance-purchase pool",
      "Institutional procurement pilot with open technical milestones",
      "Three-party R&D, advocacy, and climate-finance compact",
    ],
    validationQuestions: [
      "Will purchases displace rather than supplement animal products?",
      "Which cost, quality, nutrition, welfare, and emissions thresholds are binding?",
      "How much technical output remains openly available?",
      "Is there a credible buyer and delivery pathway?",
    ],
    safetyChecks: [
      "Screen for greenwashing and weak additionality.",
      "Measure actual displacement and rebound effects.",
      "Evaluate assurance or dominant-assurance mechanisms; do not assume either is viable.",
    ],
    confidence: 72,
    sensitivity: "standard",
    evidenceLabel: "Promising three-party structure; market additionality and displacement are decisive.",
  },
  {
    id: "ai-governance-advocacy-operations",
    title: "AI-governance and advocacy-operations exchange",
    summary:
      "An AI-governance organization could fund a bounded training engagement, shared hire, or backfilled secondment from a mature advocacy organization with policy, coalition, communications, or campaign expertise.",
    classification: "mixed_moral_trade_hypothesis",
    actorScopes: ["individual", "team", "organization", "funder"],
    triggerTerms: [
      "AI governance",
      "AI policy",
      "animal welfare",
      "climate",
      "advocacy",
      "coalition",
      "policy operations",
    ],
    sourceFieldIds: ["ai-governance", "farmed-animal-welfare", "climate-clean-energy"],
    offeredCause: "Stronger AI-governance execution",
    requestedCause: "Mature advocacy, coalition, and policy operations",
    firstPartyGives: "Full backfill, unrestricted mission support, and AI-policy orientation",
    firstPartyReceives: "Training, playbooks, shared-hire capacity, or a bounded voluntary secondment",
    counterpartyGives: "Defined transferable capability without sacrificing core output",
    counterpartyReceives: "Full opportunity-cost coverage plus an unrestricted moral-surplus contribution",
    noTradeBaseline:
      "The AI-governance organization builds operations more slowly, while the source organization retains all capacity but receives no additional mission funding.",
    candidateStructures: [
      "Training package with workshops, playbooks, and office hours",
      "Shared new hire",
      "Backfilled part-time secondment with a stop rule tied to source output",
    ],
    validationQuestions: [
      "Which capability is genuinely transferable to the AI-policy context?",
      "What is the fully loaded opportunity cost, including backfill and lost output?",
      "Has the individual freely consented before being named or introduced?",
      "Would a conventional hire dominate this structure?",
    ],
    safetyChecks: [
      "No named employee before consent.",
      "Protect the source organization's counterfactual output.",
      "Review political, reputational, and mission-drift spillovers.",
    ],
    confidence: 70,
    sensitivity: "elevated",
    evidenceLabel: "Capability fit is plausible; organization-specific availability cannot be inferred publicly.",
  },
  {
    id: "professional-time-for-cause-funding",
    title: "Professional time for cause funding",
    summary:
      "An individual or team could contribute a bounded skill that a counterparty values in exchange for a donation or project contribution to a cause the contributor prioritizes more strongly.",
    classification: "mixed_moral_trade_hypothesis",
    actorScopes: ["individual", "researcher", "team", "organization"],
    triggerTerms: ["*"],
    sourceFieldIds: [],
    offeredCause: "Funding for a prioritized cause",
    requestedCause: "A bounded professional contribution",
    firstPartyGives: "A clearly scoped skill, review, introduction, analysis, or implementation task",
    firstPartyReceives: "A donation or project contribution to the cause they prioritize",
    counterpartyGives: "Funding at or above the contributor's full opportunity cost",
    counterpartyReceives: "A useful task that would otherwise be difficult or expensive to obtain",
    noTradeBaseline:
      "The skill is not contributed and the cause receives no additional funding from this counterparty.",
    candidateStructures: [
      "One-off skill-for-donation agreement",
      "Milestone-based contribution with evidence",
      "Backfilled volunteer or pro-bono engagement",
    ],
    validationQuestions: [
      "What skill is genuinely available, and what is its full opportunity cost?",
      "Would either side have taken the same action without the exchange?",
      "Do differences in moral priorities materially create the deal?",
      "Can the task and donation be verified without invasive monitoring?",
    ],
    safetyChecks: [
      "No coerced labor, vulnerable-person targeting, or uncompensated hidden work.",
      "Do not label the arrangement moral trade until moral-priority differences are confirmed.",
      "Reject threats to withdraw independently required safety or care.",
    ],
    confidence: 68,
    sensitivity: "standard",
    evidenceLabel: "General personal moral-trade template; feasibility depends on a specific skill and counterparty.",
    generic: true,
  },
  {
    id: "reciprocal-donation-redirect",
    title: "Reciprocal donation redirect",
    summary:
      "Two donors with approximately reversed cause priorities could conditionally redirect part of planned donations so that each gains more by their own lights than under the no-trade plan.",
    classification: "moral_trade_hypothesis",
    actorScopes: ["individual", "funder", "organization"],
    triggerTerms: ["*"],
    sourceFieldIds: [],
    offeredCause: "More funding for each donor's higher-priority cause",
    requestedCause: "Conditional redirection of already-planned donations",
    firstPartyGives: "A bounded redirection away from a lower-priority planned donation",
    firstPartyReceives: "A reciprocal redirection toward their higher-priority cause",
    counterpartyGives: "The mirror-image redirection under agreed ratios",
    counterpartyReceives: "Greater expected moral value by their own priorities",
    noTradeBaseline:
      "Both donors execute their original donation plans independently, including any offsetting or lower-priority effects.",
    candidateStructures: [
      "One-to-one conditional redirect",
      "Ratio-adjusted redirect reflecting different effectiveness beliefs",
      "Escrow-free simultaneous donation with receipts",
    ],
    validationQuestions: [
      "Were the donations genuinely planned before the match?",
      "What ratio is acceptable under each donor's beliefs?",
      "Are the receiving entities eligible and independently verified?",
      "Does the arrangement create political, legal, or third-party risks?",
    ],
    safetyChecks: [
      "No election-related or otherwise regulated donation path without legal review.",
      "Require counterfactual-baseline evidence above the value threshold.",
      "Do not count relabeled preexisting donations as additional impact.",
    ],
    confidence: 81,
    sensitivity: "standard",
    evidenceLabel: "Canonical moral-trade structure; counterfactual trust is the main practical constraint.",
    generic: true,
  },
  {
    id: "moral-public-good-cofund",
    title: "Moral-public-good Co-Fund candidate",
    summary:
      "A group that each values the same moral public good somewhat—but not enough to fund alone—could investigate a conditional Co-Fund or consortium structure.",
    classification: "moral_public_good_coordination",
    actorScopes: ["individual", "team", "organization", "funder", "coalition"],
    triggerTerms: ["*"],
    sourceFieldIds: [],
    offeredCause: "A shared moral public good",
    requestedCause: "Coordinated conditional contributions",
    firstPartyGives: "A contribution conditional on a credible coalition and verified implementation plan",
    firstPartyReceives: "A larger shared good than any participant would independently fund",
    counterpartyGives: "Parallel conditional contributions and governance participation",
    counterpartyReceives: "The same shared good, valued for moral rather than exclusively private reasons",
    noTradeBaseline:
      "Each participant free-rides or funds only idiosyncratic priorities, and the shared project remains underfunded.",
    candidateStructures: [
      "Small invited consortium with anchor commitments",
      "Conditional Co-Fund with transparent threshold and fallback",
      "Matching-fund or procurement structure when a conventional mechanism dominates",
    ],
    validationQuestions: [
      "How many participants share the goal, and how strongly?",
      "What is the free-rider equilibrium under the proposed threshold?",
      "Who anchors, underwrites, or supplies matching funds?",
      "Would direct funding, procurement, taxation, or a smaller coalition work better?",
    ],
    safetyChecks: [
      "Run explicit free-rider, threshold, and participation analysis.",
      "Evaluate assurance and dominant-assurance contracts; never recommend them automatically.",
      "Screen coalition goods that impose costs on nonparticipants or dissenting minorities.",
    ],
    confidence: 66,
    sensitivity: "standard",
    evidenceLabel: "Potentially large gains; voluntary mechanisms remain structurally fragile.",
    generic: true,
  },
] as const satisfies readonly OpportunitySynthesisTemplate[];

export const BOTTLENECK_ATLAS_CLUSTERS = [
  "Frontier and catastrophic risks",
  "Global health and development",
  "Animals, food, and climate",
  "Epistemic and scientific infrastructure",
] as const satisfies readonly AtlasCluster[];

export function getAtlasField(fieldId: string) {
  return BOTTLENECK_ATLAS_FIELDS.find((field) => field.id === fieldId) ?? null;
}

export function getSynthesisTemplate(templateId: string) {
  return OPPORTUNITY_SYNTHESIS_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function atlasConfidenceLabel(confidence: number) {
  if (confidence >= 85) return "High";
  if (confidence >= 70) return "Medium-high";
  return "Medium";
}

export function synthesisClassificationLabel(classification: SynthesisClassification) {
  switch (classification) {
    case "moral_trade_hypothesis":
      return "Moral-trade hypothesis";
    case "mixed_moral_trade_hypothesis":
      return "Mixed moral-trade hypothesis";
    case "moral_public_good_coordination":
      return "Moral-public-good coordination";
    default:
      return "Operational exchange";
  }
}
