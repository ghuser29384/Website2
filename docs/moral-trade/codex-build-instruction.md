# Core Moral Trade Codex Build Instruction

This is the canonical repository instruction for improving the core Moral Trade feature from the two source documents:

- `moral trade4.md`
- `Improving the Moral Trade Feature at MoralTrade.org.pdf`

## Objective

Improve the core Moral Trade product by turning the report recommendations into validator-backed, privacy-preserving, reviewable product behavior.

The repository must preserve these boundaries:

- No global platform ranking of moral value.
- No autonomous outreach or counterparty disclosure.
- No raw private-feed mining.
- No hidden reasoning transcript in public outputs.
- Exact wishes, contact details, raw source notes, private evidence, payment amounts, and agreement identifiers stay out of public previews and generic notifications.
- Matching and copilot output remain factor-code, confidence-band, consent-gated, and human-reviewed.
- Public contracts must distinguish repository validation from production liquidity, legal/tax/payment custody, or objective moral endorsement.

## Required Public Contracts

Core Moral Trade readiness evidence is spread across public contract routes. A build should inspect these surfaces before claiming readiness:

- `/api/moral-trade/health`
- `/api/moral-trade/document-coverage/health`
- `/api/moral-trade/api-contract`
- `/api/moral-trade/data-model/contract`
- `/api/moral-trade/schemas`
- `/api/moral-trade/copilot/contract`
- `/api/moral-trade/review-workflow/contract`
- `/api/moral-trade/reasoning/packets`
- `/api/moral-trade/provenance/schema`
- `/api/moral-trade/match-signal/contract`
- `/api/moral-trade/disclosure/contract`
- `/api/moral-trade/challenge-appeal/contract`
- `/api/moral-trade/evaluation/health`
- `/api/moral-trade/operations/health`
- `/api/moral-trade/security/health`
- `/api/moral-trade/performance/health`
- `/api/moral-trade/incident-response/health`
- `/api/moral-trade/externality/health`
- `/api/moral-trade/ai-governance/health`
- `/api/moral-trade/transparency/report`

## Required Local Gates

Run the focused core Moral Trade suite before treating a change as locally verified:

```bash
node --import tsx --test src/lib/moral-trade/*.test.ts src/lib/background-ai-shadow.test.ts src/lib/background-networking.test.ts src/lib/background-notification-policy.test.ts src/lib/background-notifications.test.ts src/lib/background-privacy-controls.test.ts src/lib/background-explanations.test.ts src/lib/background-opportunity-briefs.test.ts src/lib/wish-registry.test.ts src/lib/public-route-smoke.test.ts
```

Run repository lint and whitespace checks:

```bash
npm run lint
git diff --check
```

Use `npm run build` before production release or deployment claims. A green test run without a production build does not prove deployability.

## Review Checklist

Before committing a Moral Trade improvement, confirm that the change strengthens at least one report recommendation family:

- Core data model and public validators.
- Workflow cards and factor-code explanations.
- Provenance-first evidence objects.
- Schema-bound copilot behavior.
- Privacy, matching, disclosure, and notification guardrails.
- Externality, challenge, appeal, and remedy review.
- Evaluation, operations, security, performance, incident response, and rollout gates.

Also confirm that the change does not introduce:

- Raw scores where a confidence band is enough.
- Private exact wishes, source notes, contact details, payment amounts, agreement IDs, or raw evidence in public or generic notification surfaces.
- LLM state changes, autonomous disclosure, autonomous outreach, or hidden moral ranking.
- Escrow, custody, legal, tax, investment, guarantee, or objective endorsement claims.

## Non-Claims

This instruction is a repository verification artifact. It does not prove live production liquidity, successful real-world trades, production uptime, payment custody, tax/legal treatment, or zero security risk.
