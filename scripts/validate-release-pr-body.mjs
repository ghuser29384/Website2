import { readFileSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const RELEASE_CLASSIFICATIONS = Object.freeze([
  "Runtime-affecting",
  "Repository-only",
  "Mixed or uncertain",
]);

export const RELEASE_DISPOSITIONS = Object.freeze([
  "Explicit production release and post-release smoke test required",
  "Merge after repository gates; no manual production promotion required",
  "Ordinary automatic `main` deployment may occur, but it is not necessary to fix production",
  "Do not merge or deploy yet; blockers remain",
]);

export const VERIFICATION_ITEMS = Object.freeze([
  "Focused tests passed",
  "Repository tests passed, or an exact-base differential policy is documented",
  "ESLint passed",
  "TypeScript passed",
  "Production build passed",
  "Rendered desktop/mobile checks passed when user-visible behavior changed",
  "Database, authorization, payment, job, or environment checks passed when applicable",
  "Exact diff inspected for unrelated changes",
]);

const REQUIRED_SECTION_NAMES = Object.freeze([
  "Source of truth",
  "Release classification",
  "Classification evidence",
  "Release disposition",
  "Deployment and post-release procedure",
  "Verification",
  "Checks actually run",
  "Production evidence",
]);

const PRODUCTION_EVIDENCE_FIELDS = Object.freeze([
  "Merged commit",
  "Vercel deployment",
  "Target and aliases",
  "Canonical URLs checked",
  "Runtime-log inspection window",
  "Remaining risks or verification limits",
]);

const DEPLOYMENT_PLAN_FIELDS = Object.freeze([
  "Deployment target / plan",
  "Post-release verification plan",
]);

function normalizeHeading(value) {
  return value
    .replace(/\s+#+\s*$/, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseHeadings(body) {
  const lines = String(body ?? "").replace(/\r\n?/g, "\n").split("\n");
  const headings = [];
  let fence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === marker) fence = null;
      else if (!fence) fence = marker;
      continue;
    }
    if (fence) continue;

    const headingMatch = line.match(/^(#{1,6})[ \t]+(.+?)\s*$/);
    if (!headingMatch) continue;
    headings.push({
      level: headingMatch[1].length,
      name: normalizeHeading(headingMatch[2]),
      displayName: headingMatch[2].trim(),
      line: index,
    });
  }

  return { lines, headings };
}

function findSections(body, sectionName) {
  const { lines, headings } = parseHeadings(body);
  const target = normalizeHeading(sectionName);
  const matches = headings.filter((heading) => heading.name === target);

  return matches.map((heading) => {
    const next = headings.find(
      (candidate) => candidate.line > heading.line && candidate.level <= heading.level,
    );
    const endLine = next ? next.line : lines.length;
    return {
      ...heading,
      content: lines.slice(heading.line + 1, endLine).join("\n").trim(),
    };
  });
}

function getUniqueSection(body, sectionName, errors) {
  const sections = findSections(body, sectionName);
  if (sections.length === 0) {
    errors.push(`Missing required section: ${sectionName}.`);
    return null;
  }
  if (sections.length > 1) {
    errors.push(`Section must appear exactly once: ${sectionName}.`);
    return null;
  }
  return sections[0];
}

function normalizeCheckboxLabel(value) {
  return value
    .replace(/<!--[^]*?-->/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+[—–-]\s+.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseExpectedCheckboxes(section, expectedLabels, groupName, errors) {
  const entries = [];
  for (const line of section?.content.split("\n") ?? []) {
    const match = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (!match) continue;
    const normalized = normalizeCheckboxLabel(match[2]);
    const expected = expectedLabels.find(
      (label) => normalized.toLowerCase() === normalizeCheckboxLabel(label).toLowerCase(),
    );
    if (!expected) continue;
    entries.push({ label: expected, selected: match[1].toLowerCase() === "x" });
  }

  for (const label of expectedLabels) {
    const count = entries.filter((entry) => entry.label === label).length;
    if (count === 0) errors.push(`${groupName} is missing option: ${label}.`);
    if (count > 1) errors.push(`${groupName} repeats option: ${label}.`);
  }

  return entries.filter((entry) => entry.selected).map((entry) => entry.label);
}

function stripMarkdownForEvidence(value) {
  return String(value ?? "")
    .replace(/<!--[^]*?-->/g, "")
    .replace(/^\s*[-*]\s+\[[ xX]\].*$/gm, "")
    .replace(/^\s*[-*]\s+[^:\n]+:\s*$/gm, "")
    .replace(/```[^]*?```/g, (block) => block.replace(/```[^\n]*\n?|```/g, ""))
    .replace(/~~~[^]*?~~~/g, (block) => block.replace(/~~~[^\n]*\n?|~~~/g, ""))
    .replace(/[*_>#`|]/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.replace(/[\[\]()]/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function isPlaceholderOnly(value) {
  const normalized = stripMarkdownForEvidence(value).replace(/[.:;,-]+$/g, "").trim();
  if (!normalized) return true;
  return [
    /^describe\b/i,
    /^link\b/i,
    /^explain\b/i,
    /^list\b/i,
    /^complete\b/i,
    /^select\b/i,
    /^tbd\b/i,
    /^todo\b/i,
    /^n\/?a\b/i,
    /^none\b/i,
    /^pending\b/i,
    /^not yet\b/i,
    /^placeholder$/i,
  ].some((pattern) => pattern.test(normalized));
}

function hasMeaningfulEvidence(value) {
  const normalized = stripMarkdownForEvidence(value);
  if (isPlaceholderOnly(normalized)) return false;
  const alphaNumeric = normalized.replace(/[^\p{L}\p{N}]+/gu, "");
  return alphaNumeric.length >= 8;
}

function extractLabeledField(sectionContent, label) {
  const lines = String(sectionContent ?? "").split("\n");
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelPattern = new RegExp(
    `^\\s*[-*]?\\s*(?:\\*\\*|__)?${escaped}(?:\\*\\*|__)?\\s*:\\s*(.*)$`,
    "i",
  );

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(labelPattern);
    if (!match) continue;
    const values = [match[1]];
    for (let next = index + 1; next < lines.length; next += 1) {
      if (/^\s*#{1,6}\s+/.test(lines[next])) break;
      if (/^\s*[-*]\s+(?:\*\*|__)?[^:\n]+(?:\*\*|__)?\s*:/.test(lines[next])) break;
      if (!lines[next].trim()) {
        if (values.some((value) => value.trim())) break;
        continue;
      }
      values.push(lines[next].trim());
    }
    return values.join(" ").trim();
  }
  return null;
}

function detectProductionClaims(body) {
  const patterns = [
    /\b(?:deployed|promoted|released)\s+(?:to|into|in)\s+production\b/i,
    /\b(?:fixed|resolved|repaired)\s+in\s+production\b/i,
    /\bproduction\s+(?:defect|issue|failure|bug)\s+(?:is|was|has been)\s+(?:fixed|resolved|repaired)\b/i,
    /\bproduction\s+is\s+healthy\b/i,
  ];
  const negationPattern = /\b(?:not|never|no|without|isn't|wasn't|hasn't|must not|do not)\b/i;
  const claims = [];

  for (const rawLine of String(body ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line || /^\s*[-*]\s+\[ \]/.test(rawLine)) continue;
    if (/^do not claim\b/i.test(line) || /^avoid these overstatements\b/i.test(line)) continue;
    if (!patterns.some((pattern) => pattern.test(line))) continue;
    if (negationPattern.test(line)) continue;
    claims.push(line);
  }

  return claims;
}

function selectedSet(values) {
  return new Set(values);
}

export function validateReleasePrBody(body) {
  const errors = [];
  const normalizedBody = String(body ?? "").replace(/\r\n?/g, "\n");
  if (!normalizedBody.trim()) {
    return {
      valid: false,
      errors: ["Pull request body is empty."],
      parsed: null,
    };
  }

  const sections = {};
  for (const name of REQUIRED_SECTION_NAMES) {
    sections[name] = getUniqueSection(normalizedBody, name, errors);
  }

  const classificationSelections = parseExpectedCheckboxes(
    sections["Release classification"],
    RELEASE_CLASSIFICATIONS,
    "Release classification",
    errors,
  );
  if (classificationSelections.length !== 1) {
    errors.push(
      `Select exactly one release classification; found ${classificationSelections.length}.`,
    );
  }
  const classification = classificationSelections.length === 1 ? classificationSelections[0] : null;

  const dispositionSelections = parseExpectedCheckboxes(
    sections["Release disposition"],
    RELEASE_DISPOSITIONS,
    "Release disposition",
    errors,
  );
  if (dispositionSelections.length === 0) {
    errors.push("Select at least one release disposition.");
  }

  const verificationSelections = parseExpectedCheckboxes(
    sections.Verification,
    VERIFICATION_ITEMS,
    "Verification checklist",
    errors,
  );
  if (verificationSelections.length === 0) {
    errors.push("Verification must mark at least one check that has actually run.");
  }

  if (!hasMeaningfulEvidence(sections["Source of truth"]?.content)) {
    errors.push("Source of truth must contain a concrete issue, request, incident, specification, or equivalent reference.");
  }
  if (!hasMeaningfulEvidence(sections["Classification evidence"]?.content)) {
    errors.push("Classification evidence must explain why the selected classification applies.");
  }
  if (!hasMeaningfulEvidence(sections["Checks actually run"]?.content)) {
    errors.push("Checks actually run must list exact commands, workflow runs, or equivalent executed evidence.");
  }

  const dispositions = selectedSet(dispositionSelections);
  const explicitRelease = RELEASE_DISPOSITIONS[0];
  const mergeWithoutManualPromotion = RELEASE_DISPOSITIONS[1];
  const ordinaryAutomaticDeployment = RELEASE_DISPOSITIONS[2];
  const blocked = RELEASE_DISPOSITIONS[3];

  if (dispositions.has(blocked) && dispositions.size > 1) {
    errors.push("The blocked disposition cannot be combined with any merge or deployment disposition.");
  }
  if (dispositions.has(explicitRelease) && dispositions.has(mergeWithoutManualPromotion)) {
    errors.push("A change cannot both require and disclaim a manual production release.");
  }
  if (dispositions.has(explicitRelease) && dispositions.has(ordinaryAutomaticDeployment)) {
    errors.push("An explicit production release cannot be combined with an incidental automatic-deployment disposition.");
  }

  if (classification === "Repository-only") {
    if (dispositions.has(explicitRelease)) {
      errors.push("Repository-only changes must not claim that an explicit production release is required.");
    }
    if (!dispositions.has(blocked) && !dispositions.has(mergeWithoutManualPromotion)) {
      errors.push("A release-ready repository-only change must select merge without manual production promotion.");
    }
    if (dispositions.has(ordinaryAutomaticDeployment) && !dispositions.has(mergeWithoutManualPromotion)) {
      errors.push("The incidental automatic-deployment disposition must accompany merge without manual promotion.");
    }
  }

  if (classification === "Runtime-affecting" || classification === "Mixed or uncertain") {
    if (!dispositions.has(blocked) && !dispositions.has(explicitRelease)) {
      errors.push("Runtime-affecting and mixed changes must select the explicit production release procedure or remain blocked.");
    }
    if (dispositions.has(mergeWithoutManualPromotion) || dispositions.has(ordinaryAutomaticDeployment)) {
      errors.push("Runtime-affecting and mixed changes cannot use a repository-only release disposition.");
    }

    for (const field of DEPLOYMENT_PLAN_FIELDS) {
      const value = extractLabeledField(
        sections["Deployment and post-release procedure"]?.content,
        field,
      );
      if (value === null) errors.push(`Deployment procedure is missing field: ${field}.`);
      else if (!hasMeaningfulEvidence(value)) {
        errors.push(`Deployment procedure field must be completed: ${field}.`);
      }
    }
  }

  const productionClaims = detectProductionClaims(normalizedBody);
  if (classification === "Repository-only" && productionClaims.length > 0) {
    errors.push("Repository-only changes must not be reported as deployed, promoted, fixed in production, or production-healthy.");
  }

  if (
    (classification === "Runtime-affecting" || classification === "Mixed or uncertain") &&
    productionClaims.length > 0
  ) {
    for (const field of PRODUCTION_EVIDENCE_FIELDS) {
      const value = extractLabeledField(sections["Production evidence"]?.content, field);
      if (value === null) errors.push(`Production evidence is missing field: ${field}.`);
      else if (!hasMeaningfulEvidence(value)) {
        errors.push(`Production evidence field must be completed before making a production claim: ${field}.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    parsed: {
      classification,
      dispositions: dispositionSelections,
      verification: verificationSelections,
      productionClaims,
    },
  };
}

function parseCliArguments(argv) {
  const options = { bodyFile: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument === "--body-file") {
      const value = argv[index + 1];
      if (!value) throw new Error("--body-file requires a path.");
      options.bodyFile = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function readBody(options) {
  if (options.bodyFile) return readFileSync(options.bodyFile, "utf8");
  if (typeof process.env.PR_BODY === "string") return process.env.PR_BODY;
  throw new Error("Provide the pull request body with PR_BODY or --body-file <path>.");
}

function escapeAnnotation(value) {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  const result = validateReleasePrBody(readBody(options));

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.valid) {
    const classification = result.parsed?.classification ?? "unknown";
    console.log(`Release classification validation passed (${classification}).`);
  } else {
    console.error("Release classification validation failed:");
    for (const error of result.errors) console.error(`- ${error}`);
  }

  if (!result.valid && process.env.GITHUB_ACTIONS === "true") {
    const message = result.errors.join(" | ");
    console.error(`::error title=Release classification validation failed::${escapeAnnotation(message)}`);
  }
  if (!result.valid) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
