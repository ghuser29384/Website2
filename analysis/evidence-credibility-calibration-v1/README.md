# Offline evidence-credibility calibration package

This directory contains the frozen machine-readable plan for the private Evidence Decision → Contextual Credibility calibration study. The implementation lives in:

- `src/lib/evidence-credibility-calibration-analysis.ts`
- `scripts/evidence-credibility-calibration-analysis.ts`
- `src/lib/evidence-credibility-calibration-analysis.test.ts`

The statistical protocol is frozen in `docs/moral-trade/evidence-credibility-calibration-analysis-plan-v1.md`. `plan.json` records the exact SHA-256 of that document, and `plan.sha256` allows a clean checkout to verify it without opening any held-out export.

## Verify the frozen plan

From this directory:

```bash
sha256sum -c plan.sha256
```

From the repository root:

```bash
printf '%s  %s\n' \
  "$(node -e "const {readFileSync}=require('node:fs');const {createHash}=require('node:crypto');process.stdout.write(createHash('sha256').update(readFileSync('docs/moral-trade/evidence-credibility-calibration-analysis-plan-v1.md')).digest('hex'))")" \
  docs/moral-trade/evidence-credibility-calibration-analysis-plan-v1.md
```

The result must equal the `analysisPlanSha256` field in `plan.json` before an export is generated or downloaded.

## Run offline

The analysis requires no Supabase, Vercel, Stripe, or production credentials once an immutable JSONL export is present.

```bash
npm run analyze:evidence-credibility -- \
  --input /private/path/evidence-credibility-calibration-export.jsonl \
  --output /private/path/new-calibration-report \
  --plan-json analysis/evidence-credibility-calibration-v1/plan.json \
  --plan-document docs/moral-trade/evidence-credibility-calibration-analysis-plan-v1.md \
  --code-commit "$(git rev-parse HEAD)" \
  --acknowledge-heldout-open
```

The output directory must not already exist. The runner fails closed before analysis when any plan, canonical row, ordered-dataset, manifest, privacy, or label-derivation check fails.

## Outputs

A successful run writes:

- `report.json`
- `report.md`
- `reliability.svg`
- `analysis-manifest.json`

All outputs remain private pseudonymized research data. They contain no raw evidence or direct identity fields, but rare combinations may remain identifying in context.

## Boundary

This package compares preregistered predictive candidates and evaluates readiness gates. This package never authorizes activation. It also never:

- interprets synthetic fixtures as empirical evidence;
- estimates causal additionality;
- activates a model;
- changes public credibility, ranking, eligibility, safeguards, restrictions, or payments;
- publishes row-level research data.

A separate immutable model-version proposal and explicit production-release decision remain mandatory after a sufficient real sample and private human review.
