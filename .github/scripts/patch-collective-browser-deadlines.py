#!/usr/bin/env python3
from pathlib import Path

SCRIPT = Path('.github/scripts/collective-commitments-adversarial-browser-qa.mjs')


def replace_exact(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one {label}; found {count}.')
    return text.replace(old, new)

text = SCRIPT.read_text()
text = replace_exact(
    text,
    '  deadline = new Date(Date.now() + 30 * 60_000),\n',
    '  deadline = new Date(Date.now() + 26 * 60 * 60_000),\n',
    'browser commitment default deadline',
)
text = replace_exact(
    text,
    '''function unwrapCommitmentDataKey(commitmentId, payload) {
  return decryptBytes(
    collectiveMasterKey,
    payload,
    Buffer.from(`collective-commitment-key:${commitmentId}`, "utf8"),
  );
}

''',
    '''function unwrapCommitmentDataKey(commitmentId, payload) {
  return decryptBytes(
    collectiveMasterKey,
    payload,
    Buffer.from(`collective-commitment-key:${commitmentId}`, "utf8"),
  );
}

function wrapCommitmentDataKey(commitmentId, dataKey) {
  return encryptBytes(
    collectiveMasterKey,
    dataKey,
    Buffer.from(`collective-commitment-key:${commitmentId}`, "utf8"),
  );
}

''',
    'data-key wrapper insertion',
)
helper = '''async function createCommitmentDirectly({
  propositionType,
  titleSuffix,
  threshold = 2,
  deadline,
}) {
  const typeMeta = PROPOSITION_TYPES.find((item) => item.value === propositionType);
  if (!typeMeta) throw new Error(`Unknown proposition type: ${propositionType}`);
  if (!(deadline instanceof Date) || !Number.isFinite(deadline.getTime())) {
    throw new Error("Direct commitment creation requires a valid deadline.");
  }

  const commitmentId = randomUUID();
  const title = `${TITLE_PREFIX}${runTag}] ${titleSuffix}`;
  const propositionText =
    `Synthetic ${typeMeta.label} proposition for isolated run ${runTag}; no real person, employer, party, institution, or disclosure is involved.`;
  const requirementsText =
    "Must be one of the synthetic verified QA identities created for this exact workflow run.";
  const eligibilityRule =
    `Exact auth-user and operator-reviewed synthetic credential set for run ${runTag}.`;
  const dataKey = randomBytes(32);
  const wrappedKey = wrapCommitmentDataKey(commitmentId, dataKey);
  const termsHash = createHash("sha256")
    .update(JSON.stringify({
      commitmentId,
      title,
      propositionType,
      propositionText,
      requirementsText,
      eligibilityRule,
      threshold,
      deadline: deadline.toISOString(),
    }))
    .digest("hex");
  const riskDimensions = typeMeta.highRisk ? ["financial", "reputational"] : [];

  const { data, error } = await admin.rpc("create_collective_commitment_v1", {
    p_id: commitmentId,
    p_creator_id: actors.creator.id,
    p_title: title,
    p_proposition_type: propositionType,
    p_proposition_text: propositionText,
    p_requirements_text: requirementsText,
    p_eligibility_rule: eligibilityRule,
    p_threshold_count: threshold,
    p_deadline_at: deadline.toISOString(),
    p_risk_class: typeMeta.highRisk ? "high" : "standard",
    p_risk_dimensions: riskDimensions,
    p_terms_hash: termsHash,
    p_wrapped_key_ciphertext: wrappedKey.ciphertextBase64,
    p_wrapped_key_iv: wrappedKey.ivBase64,
    p_wrapped_key_tag: wrappedKey.tagBase64,
  });
  if (error) throw new Error(error.message);
  expect(data?.id).toBe(commitmentId);

  createdCommitmentIds.push(commitmentId);
  audit.commitments.push({
    id: commitmentId,
    propositionType,
    title,
    threshold,
    deadline: deadline.toISOString(),
    createdThrough: "guarded-service-rpc-for-short-expiry",
  });
  return { id: commitmentId, title, deadline, propositionType };
}

'''
text = replace_exact(
    text,
    'async function prepareSignForm(session, commitment, { publishAffiliation = false } = {}) {\n',
    helper + 'async function prepareSignForm(session, commitment, { publishAffiliation = false } = {}) {\n',
    'direct commitment helper insertion',
)
text = replace_exact(
    text,
    '''    expiryCommitment = await createCommitmentThroughBrowser(creatorSession, {
      propositionType: "funding_pledge",
      titleSuffix: "deadline-expiry-erasure",
      threshold: 2,
      deadline: expiryDeadline,
    });
''',
    '''    expiryCommitment = await createCommitmentDirectly({
      propositionType: "funding_pledge",
      titleSuffix: "deadline-expiry-erasure",
      threshold: 2,
      deadline: expiryDeadline,
    });
    await creatorSession.page.goto(`/collective-commitments/${expiryCommitment.id}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(creatorSession.page.getByRole("heading", { name: expiryCommitment.title })).toBeVisible();
''',
    'short expiry creation path',
)
SCRIPT.write_text(text)
