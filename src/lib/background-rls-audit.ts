export const BACKGROUND_RLS_AUDIT_CONTRACT_VERSION =
  "background-rls-audit-v0.1-2026-05";
export const BACKGROUND_RLS_AUDIT_VALIDATOR_VERSION =
  "background-rls-audit-validator-v0.1";

export type BackgroundRlsAuditCategory =
  | "private_profile"
  | "private_source"
  | "participant_match"
  | "privacy_grant"
  | "operator_review"
  | "notification"
  | "delegate_helper"
  | "audit_event";

export interface BackgroundRlsTableRequirement {
  category: BackgroundRlsAuditCategory;
  disallowAnonPolicies: boolean;
  minimumPolicyCount: number;
  rationale: string;
  requiredFragments: string[];
  requiredPolicies: string[];
  table: string;
}

export interface BackgroundSensitiveStorageRequirement {
  columns: Array<{ name: string; typeFragment: string }>;
  rationale: string;
  table: string;
}

export interface BackgroundRlsAuditContract {
  contractTests: string[];
  invariants: string[];
  purpose: string;
  sensitiveStorageRequirements: BackgroundSensitiveStorageRequirement[];
  tableRequirements: BackgroundRlsTableRequirement[];
  version: typeof BACKGROUND_RLS_AUDIT_CONTRACT_VERSION;
}

export interface BackgroundRlsTableFinding {
  category: BackgroundRlsAuditCategory;
  disallowedAnonPolicyFound: boolean;
  expectedPolicyCount: number;
  missingFragments: string[];
  missingPolicies: string[];
  policyCount: number;
  rlsEnabled: boolean;
  status: "pass" | "fail";
  table: string;
}

export interface BackgroundSensitiveStorageFinding {
  missingColumns: string[];
  status: "pass" | "fail";
  table: string;
}

export interface BackgroundRlsAuditValidation {
  blockers: string[];
  contractVersion: typeof BACKGROUND_RLS_AUDIT_CONTRACT_VERSION;
  rlsFindings: BackgroundRlsTableFinding[];
  sensitiveStorageFindings: BackgroundSensitiveStorageFinding[];
  status: "pass" | "fail";
  validatorName: "background-rls-audit";
  validatorVersion: typeof BACKGROUND_RLS_AUDIT_VALIDATOR_VERSION;
}

export interface BackgroundRlsAuditContractCheck {
  evidence: string;
  id: string;
  label: string;
  status: "pass" | "fail";
}

export interface BackgroundRlsAuditContractValidation {
  blockers: string[];
  checks: BackgroundRlsAuditContractCheck[];
  contractVersion: typeof BACKGROUND_RLS_AUDIT_CONTRACT_VERSION;
  status: "pass" | "fail";
  validatorName: "background-rls-audit-contract";
  validatorVersion: typeof BACKGROUND_RLS_AUDIT_VALIDATOR_VERSION;
}

const CONTRACT_TESTS = [
  "background_rls_audit_contract_smoke",
  "background_rls_audit_schema_smoke",
  "background_rls_audit_missing_rls_regression",
  "background_rls_audit_sensitive_storage_regression",
  "background_rls_audit_public_route_smoke",
] as const;

const TABLE_REQUIREMENTS: BackgroundRlsTableRequirement[] = [
  {
    category: "private_profile",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Private wish profiles must remain owner-scoped and never publicly readable.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "wish_profiles_select_own",
      "wish_profiles_insert_own",
      "wish_profiles_update_own",
    ],
    table: "wish_profiles",
  },
  {
    category: "private_profile",
    disallowAnonPolicies: true,
    minimumPolicyCount: 4,
    rationale:
      "Wish entries may expose only preview-safe rows to signed-in viewers while private bodies stay owner-scoped.",
    requiredFragments: [
      "profile_id = (select auth.uid())",
      "visibility = 'preview'",
      "public.wish_profile_is_previewable(profile_id)",
    ],
    requiredPolicies: [
      "wish_entries_select_own_or_preview",
      "wish_entries_insert_own",
      "wish_entries_update_own",
      "wish_entries_delete_own",
    ],
    table: "wish_entries",
  },
  {
    category: "private_source",
    disallowAnonPolicies: true,
    minimumPolicyCount: 4,
    rationale: "Manual source notes and captured summaries are private owner-scoped records.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "profile_sources_select_own",
      "profile_sources_insert_own",
      "profile_sources_update_own",
      "profile_sources_delete_own",
    ],
    table: "profile_sources",
  },
  {
    category: "private_source",
    disallowAnonPolicies: true,
    minimumPolicyCount: 4,
    rationale:
      "External source connector permissions are revocable, profile-owned consent records.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "source_connections_select_own",
      "source_connections_insert_own",
      "source_connections_update_own",
      "source_connections_delete_own",
    ],
    table: "source_connections",
  },
  {
    category: "private_profile",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Deterministic synthesis rows may contain sensitive summaries and must be owner-scoped.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "profile_syntheses_select_own",
      "profile_syntheses_insert_own",
      "profile_syntheses_update_own",
    ],
    table: "profile_syntheses",
  },
  {
    category: "delegate_helper",
    disallowAnonPolicies: true,
    minimumPolicyCount: 4,
    rationale: "Saved searches are private owner-owned query preferences.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "saved_searches_select_own",
      "saved_searches_insert_own",
      "saved_searches_update_own",
      "saved_searches_delete_own",
    ],
    table: "saved_searches",
  },
  {
    category: "participant_match",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale:
      "Match suggestions are participant-visible only through match identity helpers and limited dismiss updates.",
    requiredFragments: [
      "public.viewer_can_see_match_identity(id)",
      "public.viewer_participates_in_match(id)",
      "status = 'dismissed'",
      "identity_revealed = false",
    ],
    requiredPolicies: [
      "match_suggestions_select_participants",
      "match_suggestions_insert_participants",
      "match_suggestions_update_participants",
    ],
    table: "match_suggestions",
  },
  {
    category: "participant_match",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Match consent records belong to match participants only.",
    requiredFragments: [
      "profile_id = (select auth.uid())",
      "public.viewer_participates_in_match(match_id)",
    ],
    requiredPolicies: [
      "match_consents_select_match_participants",
      "match_consents_insert_own",
      "match_consents_update_own",
    ],
    table: "match_consents",
  },
  {
    category: "notification",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Wish notifications are recipient-owned and may only be inserted for relevant matches.",
    requiredFragments: [
      "profile_id = (select auth.uid())",
      "public.viewer_participates_in_match(match_id)",
      "public.profile_participates_in_match(match_id, profile_id)",
    ],
    requiredPolicies: [
      "wish_notifications_select_own",
      "wish_notifications_insert_relevant",
      "wish_notifications_update_own",
    ],
    table: "wish_notifications",
  },
  {
    category: "audit_event",
    disallowAnonPolicies: true,
    minimumPolicyCount: 2,
    rationale: "Match explanation snapshots expose redacted provenance only to the owning participant.",
    requiredFragments: [
      "profile_id = (select auth.uid())",
      "public.viewer_participates_in_match(match_id)",
    ],
    requiredPolicies: [
      "match_explanation_snapshots_select_own",
      "match_explanation_snapshots_insert_own",
    ],
    table: "match_explanation_snapshots",
  },
  {
    category: "audit_event",
    disallowAnonPolicies: true,
    minimumPolicyCount: 2,
    rationale: "Background query events are owner-scoped anti-enumeration telemetry.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: ["background_query_events_select_own", "background_query_events_insert_own"],
    table: "background_query_events",
  },
  {
    category: "notification",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Background notification preferences are private owner-owned channel choices.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "background_notification_preferences_select_own",
      "background_notification_preferences_insert_own",
      "background_notification_preferences_update_own",
    ],
    table: "background_notification_preferences",
  },
  {
    category: "private_profile",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Data-right requests may expose deletion/export status only to the requester.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "profile_data_right_requests_select_own",
      "profile_data_right_requests_insert_own",
      "profile_data_right_requests_update_own_open",
    ],
    table: "profile_data_right_requests",
  },
  {
    category: "operator_review",
    disallowAnonPolicies: true,
    minimumPolicyCount: 2,
    rationale: "Match reports are submitted by participants and visible only to their reporter in-app.",
    requiredFragments: [
      "reporter_profile_id = (select auth.uid())",
      "public.viewer_participates_in_match(match_id)",
    ],
    requiredPolicies: ["match_reports_select_own", "match_reports_insert_own_participant"],
    table: "match_reports",
  },
  {
    category: "delegate_helper",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Personal delegates are owner-scoped helper preferences.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "personal_delegates_select_own",
      "personal_delegates_insert_own",
      "personal_delegates_update_own",
    ],
    table: "personal_delegates",
  },
  {
    category: "delegate_helper",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Helper strategies are owner-scoped scan configuration.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "helper_strategies_select_own",
      "helper_strategies_insert_own",
      "helper_strategies_update_own",
    ],
    table: "helper_strategies",
  },
  {
    category: "delegate_helper",
    disallowAnonPolicies: true,
    minimumPolicyCount: 2,
    rationale: "Helper runs are owner-scoped execution records.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: ["helper_runs_select_own", "helper_runs_insert_own"],
    table: "helper_runs",
  },
  {
    category: "participant_match",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Introduction plans are visible only to the two match participants.",
    requiredFragments: [
      "profile_id = (select auth.uid())",
      "counterparty_id = (select auth.uid())",
      "public.viewer_participates_in_match(match_id)",
    ],
    requiredPolicies: [
      "match_introduction_plans_select_participants",
      "match_introduction_plans_insert_participants",
      "match_introduction_plans_update_own",
    ],
    table: "match_introduction_plans",
  },
  {
    category: "participant_match",
    disallowAnonPolicies: true,
    minimumPolicyCount: 2,
    rationale: "Introduction tasks are scoped to the owning participant.",
    requiredFragments: ["profile_id = (select auth.uid())"],
    requiredPolicies: [
      "match_introduction_tasks_select_own",
      "match_introduction_tasks_update_own",
    ],
    table: "match_introduction_tasks",
  },
  {
    category: "privacy_grant",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale:
      "Privacy grants may be read by owners or granted counterparties and changed only by owners.",
    requiredFragments: [
      "profile_id = (select auth.uid())",
      "counterparty_id = (select auth.uid())",
      "status = 'granted'",
    ],
    requiredPolicies: [
      "privacy_grants_select_relevant",
      "privacy_grants_insert_own",
      "privacy_grants_update_own",
    ],
    table: "privacy_grants",
  },
  {
    category: "privacy_grant",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Privacy access requests are visible only to the requester and grant owner.",
    requiredFragments: [
      "owner_profile_id = (select auth.uid())",
      "requester_profile_id = (select auth.uid())",
      "public.profile_participates_in_match(match_id, (select auth.uid()))",
    ],
    requiredPolicies: [
      "privacy_access_requests_select_relevant",
      "privacy_access_requests_insert_requester",
      "privacy_access_requests_update_relevant",
    ],
    table: "privacy_access_requests",
  },
  {
    category: "operator_review",
    disallowAnonPolicies: true,
    minimumPolicyCount: 3,
    rationale: "Concierge requests are visible to the requester and target participant only.",
    requiredFragments: [
      "requester_profile_id = (select auth.uid())",
      "target_profile_id = (select auth.uid())",
    ],
    requiredPolicies: [
      "match_concierge_requests_select_relevant",
      "match_concierge_requests_insert_requester",
      "match_concierge_requests_update_requester_open",
    ],
    table: "match_concierge_requests",
  },
  {
    category: "operator_review",
    disallowAnonPolicies: true,
    minimumPolicyCount: 1,
    rationale: "Concierge events inherit requester/target visibility from their concierge request.",
    requiredFragments: [
      "public.match_concierge_requests",
      "requester_profile_id = (select auth.uid())",
      "target_profile_id = (select auth.uid())",
    ],
    requiredPolicies: ["match_concierge_events_select_relevant"],
    table: "match_concierge_events",
  },
  {
    category: "operator_review",
    disallowAnonPolicies: true,
    minimumPolicyCount: 2,
    rationale: "Risk signals are participant-relevant redacted safety records, not public search data.",
    requiredFragments: [
      "profile_id = (select auth.uid())",
      "public.viewer_participates_in_match(match_id)",
    ],
    requiredPolicies: ["risk_signals_select_relevant", "risk_signals_insert_relevant"],
    table: "risk_signals",
  },
  {
    category: "audit_event",
    disallowAnonPolicies: true,
    minimumPolicyCount: 2,
    rationale: "Match audit events expose only participant-relevant redacted audit records.",
    requiredFragments: [
      "actor_profile_id = (select auth.uid())",
      "public.viewer_participates_in_match(match_id)",
    ],
    requiredPolicies: [
      "match_audit_events_select_participants",
      "match_audit_events_insert_participants",
    ],
    table: "match_audit_events",
  },
];

const SENSITIVE_STORAGE_REQUIREMENTS: BackgroundSensitiveStorageRequirement[] = [
  {
    columns: [
      { name: "sensitive_ciphertexts", typeFragment: "jsonb" },
      { name: "sensitive_encryption_version", typeFragment: "text" },
    ],
    rationale:
      "Exact wish capabilities, constraints, verification notes, uncertainty, and brokerage notes must have encrypted storage slots.",
    table: "wish_profiles",
  },
  {
    columns: [
      { name: "body_ciphertext", typeFragment: "text" },
      { name: "body_encryption_version", typeFragment: "text" },
    ],
    rationale: "Private wish-entry body text must have ciphertext and version columns.",
    table: "wish_entries",
  },
  {
    columns: [
      { name: "sensitive_ciphertexts", typeFragment: "jsonb" },
      { name: "sensitive_encryption_version", typeFragment: "text" },
    ],
    rationale: "Manual source notes and excerpts must have encrypted storage slots.",
    table: "profile_sources",
  },
  {
    columns: [
      { name: "sensitive_ciphertexts", typeFragment: "jsonb" },
      { name: "sensitive_encryption_version", typeFragment: "text" },
    ],
    rationale: "Source connector consent notes and summaries must have encrypted storage slots.",
    table: "source_connections",
  },
  {
    columns: [
      { name: "sensitive_ciphertexts", typeFragment: "jsonb" },
      { name: "sensitive_encryption_version", typeFragment: "text" },
    ],
    rationale: "Profile synthesis summaries must have encrypted storage slots.",
    table: "profile_syntheses",
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSql(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractPolicyBlocks(schemaSql: string, table: string) {
  const blocks = new Map<string, string>();
  const policyRegex = new RegExp(
    `create\\s+policy\\s+"([^"]+)"\\s+on\\s+public\\.${escapeRegExp(
      table,
    )}\\s+[\\s\\S]*?;`,
    "gi",
  );

  for (const match of schemaSql.matchAll(policyRegex)) {
    const [, policyName] = match;

    if (policyName) {
      blocks.set(policyName, match[0]);
    }
  }

  return blocks;
}

function extractTableStorageSql(schemaSql: string, table: string) {
  const createTableRegex = new RegExp(
    `create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${escapeRegExp(
      table,
    )}\\s*\\([\\s\\S]*?\\n\\);`,
    "i",
  );
  const alterColumnRegex = new RegExp(
    `alter\\s+table\\s+public\\.${escapeRegExp(
      table,
    )}\\s+add\\s+column\\s+if\\s+not\\s+exists\\s+[^;]+;`,
    "gi",
  );

  return [schemaSql.match(createTableRegex)?.[0] ?? "", ...schemaSql.matchAll(alterColumnRegex)]
    .map((match) => (typeof match === "string" ? match : match[0]))
    .join("\n");
}

function hasRlsEnabled(schemaSql: string, table: string) {
  return new RegExp(
    `alter\\s+table\\s+public\\.${escapeRegExp(
      table,
    )}\\s+enable\\s+row\\s+level\\s+security\\s*;`,
    "i",
  ).test(schemaSql);
}

function checkContract(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): BackgroundRlsAuditContractCheck {
  return {
    evidence,
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

export function getBackgroundRlsAuditContract(): BackgroundRlsAuditContract {
  return {
    contractTests: [...CONTRACT_TESTS],
    invariants: [
      "Every private or participant-linked background-networking table must enable row-level security.",
      "Private wishes, source summaries, saved searches, grants, notifications, helper records, and audit events must not define anonymous table policies.",
      "Participant-visible match tables must use participant helper checks rather than public reads.",
      "Sensitive free-text storage must provide ciphertext and encryption-version columns so application-level field encryption can fail closed.",
      "The broad preview surface remains separated from private tables through wish_profile_previews and participant-safe match previews.",
    ],
    purpose:
      "Executable schema audit for background-networking row-level security and sensitive free-text storage boundaries.",
    sensitiveStorageRequirements: SENSITIVE_STORAGE_REQUIREMENTS,
    tableRequirements: TABLE_REQUIREMENTS,
    version: BACKGROUND_RLS_AUDIT_CONTRACT_VERSION,
  };
}

export function validateBackgroundRlsAuditContract(
  contract: BackgroundRlsAuditContract = getBackgroundRlsAuditContract(),
): BackgroundRlsAuditContractValidation {
  const tableNames = contract.tableRequirements.map((requirement) => requirement.table);
  const storageTables = contract.sensitiveStorageRequirements.map((requirement) => requirement.table);
  const checks = [
    checkContract(
      "table-coverage",
      "Private, participant-linked, operator-review, helper, notification, and audit tables are covered",
      tableNames.includes("wish_profiles") &&
        tableNames.includes("profile_sources") &&
        tableNames.includes("match_suggestions") &&
        tableNames.includes("privacy_grants") &&
        tableNames.includes("match_concierge_requests") &&
        tableNames.includes("match_audit_events") &&
        tableNames.length >= 20,
      tableNames.join(", "),
    ),
    checkContract(
      "sensitive-storage-coverage",
      "Sensitive wish, source, connector, and synthesis text has ciphertext/version requirements",
      storageTables.includes("wish_profiles") &&
        storageTables.includes("wish_entries") &&
        storageTables.includes("profile_sources") &&
        storageTables.includes("source_connections") &&
        storageTables.includes("profile_syntheses") &&
        contract.sensitiveStorageRequirements.every((requirement) =>
          requirement.columns.some((column) => /ciphertext/.test(column.name)),
        ),
      storageTables.join(", "),
    ),
    checkContract(
      "no-anon-private-policies",
      "Background private table requirements disallow anonymous table policies",
      contract.tableRequirements.every((requirement) => requirement.disallowAnonPolicies),
      contract.tableRequirements
        .map((requirement) => `${requirement.table}:${requirement.disallowAnonPolicies}`)
        .join(", "),
    ),
    checkContract(
      "participant-helper-boundary",
      "Participant-linked match tables require participant helper checks",
      contract.tableRequirements.some(
        (requirement) =>
          requirement.table === "match_suggestions" &&
          requirement.requiredFragments.includes("public.viewer_can_see_match_identity(id)") &&
          requirement.requiredFragments.includes("public.viewer_participates_in_match(id)"),
      ) &&
        contract.tableRequirements.some(
          (requirement) =>
            requirement.table === "privacy_access_requests" &&
            requirement.requiredFragments.includes(
              "public.profile_participates_in_match(match_id, (select auth.uid()))",
            ),
        ),
      contract.tableRequirements
        .filter((requirement) => requirement.category === "participant_match")
        .map((requirement) => `${requirement.table}:${requirement.requiredFragments.length}`)
        .join(", "),
    ),
    checkContract(
      "schema-regression-tests",
      "Contract names executable schema regression tests",
      contract.contractTests.includes("background_rls_audit_schema_smoke") &&
        contract.contractTests.includes("background_rls_audit_missing_rls_regression") &&
        contract.contractTests.includes("background_rls_audit_sensitive_storage_regression"),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "background-rls-audit-contract",
    validatorVersion: BACKGROUND_RLS_AUDIT_VALIDATOR_VERSION,
  };
}

export function validateBackgroundRlsAuditSchema(
  schemaSql: string,
  contract: BackgroundRlsAuditContract = getBackgroundRlsAuditContract(),
): BackgroundRlsAuditValidation {
  const rlsFindings = contract.tableRequirements.map((requirement) => {
    const policyBlocks = extractPolicyBlocks(schemaSql, requirement.table);
    const combinedPolicies = normalizeSql(Array.from(policyBlocks.values()).join("\n"));
    const missingPolicies = requirement.requiredPolicies.filter(
      (policy) => !policyBlocks.has(policy),
    );
    const missingFragments = requirement.requiredFragments.filter(
      (fragment) => !combinedPolicies.includes(normalizeSql(fragment)),
    );
    const disallowedAnonPolicyFound =
      requirement.disallowAnonPolicies && /\bto anon\b/i.test(combinedPolicies);
    const rlsEnabled = hasRlsEnabled(schemaSql, requirement.table);
    const policyCount = policyBlocks.size;
    const status =
      rlsEnabled &&
      policyCount >= requirement.minimumPolicyCount &&
      missingPolicies.length === 0 &&
      missingFragments.length === 0 &&
      !disallowedAnonPolicyFound
        ? "pass"
        : "fail";

    return {
      category: requirement.category,
      disallowedAnonPolicyFound,
      expectedPolicyCount: requirement.minimumPolicyCount,
      missingFragments,
      missingPolicies,
      policyCount,
      rlsEnabled,
      status,
      table: requirement.table,
    } satisfies BackgroundRlsTableFinding;
  });
  const sensitiveStorageFindings = contract.sensitiveStorageRequirements.map((requirement) => {
    const tableSql = normalizeSql(extractTableStorageSql(schemaSql, requirement.table));
    const missingColumns = requirement.columns
      .filter(
        (column) =>
          !tableSql.includes(normalizeSql(`${column.name} ${column.typeFragment}`)),
      )
      .map((column) => column.name);

    return {
      missingColumns,
      status: missingColumns.length ? "fail" : "pass",
      table: requirement.table,
    } satisfies BackgroundSensitiveStorageFinding;
  });
  const blockers = [
    ...rlsFindings.flatMap((finding) => {
      const findingBlockers: string[] = [];

      if (!finding.rlsEnabled) {
        findingBlockers.push(`${finding.table}:rls-disabled`);
      }

      if (finding.policyCount < finding.expectedPolicyCount) {
        findingBlockers.push(
          `${finding.table}:policy-count:${finding.policyCount}/${finding.expectedPolicyCount}`,
        );
      }

      findingBlockers.push(
        ...finding.missingPolicies.map((policy) => `${finding.table}:missing-policy:${policy}`),
      );
      findingBlockers.push(
        ...finding.missingFragments.map(
          (fragment) => `${finding.table}:missing-policy-fragment:${fragment}`,
        ),
      );

      if (finding.disallowedAnonPolicyFound) {
        findingBlockers.push(`${finding.table}:anonymous-policy-not-allowed`);
      }

      return findingBlockers;
    }),
    ...sensitiveStorageFindings.flatMap((finding) =>
      finding.missingColumns.map((column) => `${finding.table}:missing-sensitive-column:${column}`),
    ),
  ];

  return {
    blockers,
    contractVersion: contract.version,
    rlsFindings,
    sensitiveStorageFindings,
    status: blockers.length ? "fail" : "pass",
    validatorName: "background-rls-audit",
    validatorVersion: BACKGROUND_RLS_AUDIT_VALIDATOR_VERSION,
  };
}
