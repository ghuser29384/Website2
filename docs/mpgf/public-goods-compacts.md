# Voluntary public-goods compacts

Public-goods compacts are cause-specific, opt-in constitutions. They are not government jurisdictions, Moral Trade has no taxing authority, nobody is randomly assigned, and the ordinary Moral Trade marketplace remains untaxed.

The founding charter is versioned as `mpgf-public-goods-compact/founding-v1`. It is published for Future Flourishing, Animal Welfare, and Global Health with identical founding terms:

- a monthly scheduled amount equal to 1% of self-declared eligible monthly spending, rounded down to whole cents and capped at $10;
- activation at 5,000 qualifying acceptances, after a separate person-unique identity gate is verified;
- a 12-month minimum term after activation;
- 30 days' prospective exit notice, effective no earlier than the minimum-term end;
- one member, one voting credit, with revocable delegation under published rules;
- no project-by-project refusal after activation;
- independent review and audit, additionality checks, conflict and recusal rules, minority protections, and public post-round reporting.

## Lifecycle

1. **Published:** Moral Trade publishes a cause-specific constitution. Published examples contain no fabricated members, ballots, or activity.
2. **Accepted while recruiting:** a signed-in user with a Moral Trade profile enters self-declared eligible monthly spending and explicitly acknowledges voluntary choice, the exact constitution, activation/no-project-opt-out terms, and the no-payment boundary. The RPC rejects incomplete acknowledgement payloads and the durable membership stores the acknowledgement record with the accepted constitution version. It remains `pending_activation` and is not binding. The member may revoke immediately.
3. **Activated once:** a zero-cent scheduled contribution is rejected and cannot create a membership or count toward the threshold. The schema is currently unique by account/profile, not by verified person, so the default `blocked_pending_person_unique_eligibility_policy` gate prevents automatic activation even at 5,000 qualifying acceptances. Only a separately approved migration or privileged administrator acting after Moral Trade integrates its one-person-one-account and Sybil-resistance policy may put that gate in the verified state. With the gate verified, the transaction that reaches 5,000 qualifying acceptances freezes the exact constitutional version, timestamps activation, and moves every accepted recruiting membership to `active`. The 12-month minimum term begins at that instant. A person who revoked while the compact was recruiting remains outside it after activation, but may explicitly accept the current frozen constitution again; that new acceptance becomes active immediately and still moves no money.
4. **Governed:** an allocation electorate must be explicitly activated before voting-credit delegation appears. Delegation is same-compact, active-member-only, non-self, and revocable. It transfers no membership, money, or reputation. The implementation does not invent an active ballot.
5. **Prospective exit:** an active member may request exit. Its effective date is the later of the activation date plus 12 calendar months and the request date plus 30 days. The same transaction revokes active outgoing and incoming delegations so an `exit_notice` membership cannot remain a delegation endpoint. There is no per-project opt-out state.
6. **Reported:** selected projects remain subject to independent review, additionality checks, conflicts and recusals, minority protections, and public post-round reporting.

Once a recruiting compact has a current acceptance, its published identity and constitutional terms cannot be changed. This prevents an earlier acceptance from activating under a version the member never accepted. If no current acceptances exist, a future charter revision must still be published and accepted as its exact current version before it can bind anyone.

## Money and legal boundaries

Joining, voting, delegating, and requesting exit only update compact governance records. They do not create a Stripe PaymentIntent, charge, checkout, receipt, escrow balance, custody claim, tax claim, charitable-deduction claim, or payment mandate.

Moral Trade does not represent that joining alone creates a legally enforceable debt or a provider payment mandate. Calling an activated membership binding under the voluntary compact describes the compact's published internal rule; it is not a claim of government taxing authority or automatic legal or payment enforcement.

Automatic collection is hard-disabled in the founding schema. It must remain disabled until separate legal, fiscal-sponsor or payment-provider, donor-of-record, receipt, custody, sanctions, and production-release gates pass. This feature does not change Moral Trade's existing non-custodial, direct-to-charity posture.

The stored scheduled contribution is a constitutional calculation, not proof that money moved. Private declared spending and membership state are owner-readable and RPC-managed. Direct client access to the compact table is denied; the public RPC returns published charter and activation terms plus durable aggregate qualifying-acceptance counts, while an authenticated viewer receives only their own membership and delegation state.

## Unavailable state

When Supabase is missing, unreachable, missing the RPC, or returns an invalid safety contract, `/mpgf/compacts` fails closed. It displays the three published founding charter examples, marks member counts and membership activity unavailable, disables acceptance controls, and shows no simulated ballot or payment capability.

## Verification boundary

Repository tests, TypeScript, the production build, and rendered browser checks do not establish that the PostgreSQL authorization and lifecycle rules execute correctly. Before review can advance, exact-head database gates must (1) apply the complete repository migration chain to a clean ephemeral Supabase/PostgreSQL runtime, generate types, run lint, and exercise role and genuinely concurrent activation tests; and (2) apply both compact migrations and lifecycle suites inside a transaction against the approved isolated MoralTrade QA project, roll the transaction back, and prove that no compact schema or synthetic rows remain afterward. Neither gate authorizes applying a migration to production.

## Release boundary

Migration `20260813163052_mpgf_public_goods_compacts.sql` and its hardening migration are repository code only until separately reviewed and applied. Creating this feature branch or pull request does not apply either migration, deploy a Preview or Production build, enable collection, or authorize a payment provider.
