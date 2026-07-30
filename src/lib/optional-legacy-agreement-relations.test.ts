import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isMissingOptionalLegacyAgreementRelation } from "./optional-legacy-agreement-relations";

test("recognizes the production schema-cache response for an optional legacy relation", () => {
  assert.equal(
    isMissingOptionalLegacyAgreementRelation(
      {
        code: "PGRST205",
        message:
          "Could not find the table 'public.agreement_evidence_items' in the schema cache",
      },
      "agreement_evidence_items",
    ),
    true,
  );
});

test("recognizes a PostgreSQL missing-relation response for the requested optional relation", () => {
  assert.equal(
    isMissingOptionalLegacyAgreementRelation(
      {
        code: "42P01",
        message: 'relation "public.agreement_review_cases" does not exist',
      },
      "agreement_review_cases",
    ),
    true,
  );
});

test("does not hide a missing relation error for a different table", () => {
  assert.equal(
    isMissingOptionalLegacyAgreementRelation(
      {
        code: "PGRST205",
        message:
          "Could not find the table 'public.agreement_payments' in the schema cache",
      },
      "agreement_evidence_items",
    ),
    false,
  );
});

test("does not hide permission, network, or other database failures", () => {
  for (const error of [
    { code: "42501", message: "permission denied for table agreement_evidence_items" },
    { code: "PGRST301", message: "JWT expired" },
    { message: "fetch failed" },
  ]) {
    assert.equal(
      isMissingOptionalLegacyAgreementRelation(error, "agreement_evidence_items"),
      false,
    );
  }
});

test("routine agreement and admin reads gate only the retired legacy workflow", () => {
  const appDataSource = readFileSync("src/lib/app-data.ts", "utf8");
  const agreementPageSource = readFileSync(
    "src/app/agreements/[agreementId]/page.tsx",
    "utf8",
  );
  const adminPageSource = readFileSync("src/app/admin/page.tsx", "utf8");

  assert.match(
    appDataSource,
    /isMissingOptionalLegacyAgreementRelation\(\s*evidenceItemsError,\s*"agreement_evidence_items"/,
  );
  assert.match(
    appDataSource,
    /isMissingOptionalLegacyAgreementRelation\(\s*reviewCasesError,\s*"agreement_review_cases"/,
  );
  assert.match(
    appDataSource,
    /if \(evidenceItemsError && !evidenceItemsUnavailable\)/,
  );
  assert.match(
    appDataSource,
    /if \(reviewCasesError && !reviewCasesUnavailable\)/,
  );
  assert.match(
    agreementPageSource,
    /agreement\.legacyEvidenceReviewAvailable \? \([\s\S]*submitAgreementEvidenceAction/,
  );
  assert.match(
    adminPageSource,
    /agreementReviewCasesUnavailable \? null : agreementReviewCases\.error/,
  );
});
