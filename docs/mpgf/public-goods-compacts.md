# Voluntary public-goods compacts

Public-goods compacts are cause-specific, opt-in constitutions. They are not government jurisdictions, Moral Trade has no taxing authority, nobody is randomly assigned, and the ordinary Moral Trade marketplace remains untaxed.

The founding charter is versioned as `mpgf-public-goods-compact/founding-v1`. It is published for Future Flourishing, Animal Welfare, and Global Health with identical founding terms:

- a monthly scheduled amount equal to 1% of self-declared eligible monthly spending, rounded down to whole cents and capped at $10;
- activation at 5,000 accepted members;
- a 12-month minimum term after activation;
- 30 days' prospective exit notice, effective no earlier than the minimum-term end;
- one member, one voting credit, with revocable delegation under published rules;
- no project-by-project refusal after activation;
- independent review and audit, additionality checks, conflict and recusal rules, minority protections, and public post-round reporting.

## Lifecycle

1. **Published:** Moral Trade publishes a cause-specific constitution. Published examples contain no fabricated members, ballots, or activity.
2. **Accepted while recruiting:** a signed-in user with a Moral Trade profile enters self-declared eligible monthly spending and explicitly acknowledges the current constitution. The durable membership remains `pending_activation` and is not binding. The member may revoke immediately.
3. **Activated once:** the transaction that reaches 5,000 accepted members freezes the exact constitutional version, timestamps activation, and moves every accepted recruiting membership to `active`. The 12-month minimum term begins at that instant.
4. **Governed:** an allocation electorate must be explicitly activated before voting-credit delegation appears. Delegation is same-compact, active-member-only, non-self, and revocable. It transfers no membership, money, or reputation. The implementation does not invent an active ballot.
5. **Prospective exit:** an active member may request exit. Its effective date is the later of the activation date plus 12 calendar months and the request date plus 30 days. There is no per-project opt-out state.
6. **Reported:** selected projects remain subject to independent review, additionality checks, conflicts and recusals, minority protections, and public post-round reporting.

## Money and legal boundaries

Joining, voting, delegating, and requesting exit only update compact governance records. They do not create a Stripe PaymentIntent, charge, checkout, receipt, escrow balance, custody claim, tax claim, charitable-deduction claim, or payment mandate.

Automatic collection is hard-disabled in the founding schema. It must remain disabled until separate legal, fiscal-sponsor or payment-provider, donor-of-record, receipt, custody, sanctions, and production-release gates pass. This feature does not change Moral Trade's existing non-custodial, direct-to-charity posture.

The stored scheduled contribution is a constitutional calculation, not proof that money moved. Private declared spending and membership state are owner-readable and RPC-managed. Public compact state contains published charter terms and durable aggregate accepted-member counts only when the database RPC is available.

## Unavailable state

When Supabase is missing, unreachable, missing the RPC, or returns an invalid safety contract, `/mpgf/compacts` fails closed. It displays the three published founding charter examples, marks member counts and membership activity unavailable, disables acceptance controls, and shows no simulated ballot or payment capability.

## Release boundary

Migration `20260813163052_mpgf_public_goods_compacts.sql` is repository code only until separately reviewed and applied. Creating this feature branch or pull request does not apply the migration, deploy a Preview or Production build, enable collection, or authorize a payment provider.
