# Collective identity-threshold commitments

## Product contract

A collective commitment freezes one proposition, eligibility rule, verified-signer threshold, deadline, and risk disclosure before anyone signs. A qualifying participant signs privately with a current operator-reviewed identity credential.

Before activation, the platform exposes only the qualifying signer count. It does not expose signer names, affiliations, account identifiers, credential identifiers, or contact information. If the exact threshold is reached before the deadline, the platform revalidates the full credential set and publishes every verified real name in one transaction. A verified affiliation is published only when that signer opted in. If the deadline passes, no names are published.

The supported proposition classes are:

- open or closed letters;
- workplace organizing or unionization intentions;
- coordinated whistleblowing;
- political-party dissent or defection;
- high-net-worth or institutional funding pledges;
- other identity-threshold propositions.

The five named classes are treated as high risk. The product explicitly states that a numerical threshold does not guarantee legal, employment, political, financial, reputational, physical, or practical safety.

## Identity and uniqueness

`collective_identity_credentials` records the result of identity review:

- verified real name;
- optional verified affiliation;
- a stable hashed human-uniqueness reference;
- provider and method;
- assurance tier;
- duplicate-check result;
- manual-review status;
- verification and expiry times;
- monotonically versioned credential state.

Raw documents, selfies, biometric templates, and contact details are not part of this feature schema. One account token and one human token may appear at most once in a given commitment. These tokens are HMAC-derived with commitment-specific keys, so they cannot be correlated across commitments from database contents alone.

## Cryptographic boundary

Each commitment receives a random 256-bit data key. The data key is wrapped with an environment-specific 256-bit master key. Signer payloads use AES-256-GCM with commitment-bound authenticated data. Domain-separated HKDF keys produce account tokens, human tokens, signature encryption, and reveal-manifest MACs.

The threshold transaction is split into two guarded phases:

1. PostgreSQL serializes the final signature, verifies the exact count, and moves the commitment from `open` to `activating` with a one-use activation token.
2. The server decrypts the exact signature set, revalidates every current credential, and submits a complete reveal manifest. PostgreSQL verifies the manifest's exact signature-ID set, count, reveal nonces, identity commitments, and HMACs before inserting any public signer.

Successful activation inserts all public signers and the receipt, changes the commitment to `active`, and deletes both the private signature ciphertext and wrapped data key in the same transaction. Expiry deletes the same private material and creates an `expired` receipt with signer count zero and no signer-manifest hash.

## Access control

The credential, commitment, key, private-signature, and event tables have RLS enabled and no `public`, `anon`, or `authenticated` table privileges. Mutation RPCs are executable only by `service_role`. Authenticated participant actions enter through same-origin Next.js server actions that resolve the current Supabase user before invoking service-controlled functions.

Public signer and outcome-receipt tables are readable only after rows exist. No public signer row exists before a successful atomic activation.

## Environment variables

```text
COLLECTIVE_COMMITMENTS_ENABLED=false
COLLECTIVE_COMMITMENT_MASTER_KEY=<32 random bytes encoded as base64>
COLLECTIVE_COMMITMENT_MIN_DEADLINE_MINUTES=60
CRON_SECRET=<existing authorized-job secret>
```

QA and production must use different master keys. Rotating a master key while open commitments still exist makes those commitments undecryptable; any rotation plan must either keep prior keys available or expire/migrate every open commitment first.

## Operational limits

This implementation does not guarantee secrecy after total compromise of the application, its runtime keys, and its operator controls. It cannot guarantee physical erasure from every infrastructure backup. Signers may also be exposed by their own devices, accounts, email, network metadata, external communications, legal process, or identity-verification provider. The product makes none of those stronger claims and does not claim to use a blockchain.

## Release gate

Production remains disabled until all of the following pass on the exact release candidate:

- focused model and source-contract tests;
- full repository tests, lint, production build, and `git diff --check`;
- migration application and SQL regression in the isolated MoralTrade QA project;
- authenticated desktop and mobile browser testing with multiple verified users;
- duplicate-human rejection;
- simultaneous final signatures;
- withdrawal and re-signing;
- stale-credential rejection and activation release;
- exact reveal-manifest rejection and valid activation;
- expiry erasure;
- outsider access denial;
- every high-risk proposition class;
- exact synthetic-data cleanup.

After those gates, production enablement still requires a separate controlled migration, environment configuration, smoke test, and rollback decision.
