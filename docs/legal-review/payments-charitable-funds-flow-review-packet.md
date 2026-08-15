# Counsel and Provider Review Packet: Moral Trade Payments and Charitable Funds Flows

**Prepared for:** Payments/fintech counsel, nonprofit and charitable-solicitation counsel, tax counsel, and payment-provider compliance
**Project:** Moral Trade
**Prepared:** August 7, 2026
**Requested output:** Written classification of each funds flow, required licenses and registrations, required contracts and disclosures, and a staged approval plan
**Status:** Architecture and issue-spotting packet; not a legal opinion

## 1. Decisions requested

Please classify and approve, reject, or condition the following mechanisms:

1. direct, non-custodial charitable donations completed on Every.org;
2. future conditional payments to verified organizations or individuals;
3. dominant assurance contracts with refunds or failure bonuses; and
4. a separately capitalized failure-bonus reserve that may later be financed by an explicit non-charitable fee, but not silently deducted from charitable principal.

For each mechanism, identify:

- merchant, donor, payee, and settlement recipient of record;
- whether Moral Trade accepts, controls, safeguards, or transmits funds;
- federal and state money-transmission consequences;
- charitable-solicitation, fundraising-counsel, professional-solicitor, and commercial-co-venture consequences;
- tax-deductibility and receipting treatment;
- processor product eligibility and required written approval;
- KYC/KYB, sanctions, fraud, refund, dispute, and chargeback duties;
- accounting and safeguarding controls;
- permitted fee and reserve structures; and
- exact pre-launch conditions.

## 2. Current baseline

As of August 7, 2026:

- Moral Trade's public website is live.
- Native managed payments are disabled.
- No live Stripe charge, payout, transfer, refund, reserve movement, or custody flow is authorized.
- A direct verified Donation Upgrade candidate is being integrated and tested.
- In that candidate, each participant completes a separate Every.org-hosted donation.
- Moral Trade does not receive payment credentials and does not receive, hold, combine, split, redirect, re-donate, or disburse the charitable funds.
- A browser return is non-authoritative. Fulfillment is recorded only after an exact Every.org partner webhook matches the frozen obligation, recipient, amount, donation identifier, and authenticated partner metadata.
- Every.org API, staging, and partner-webhook access remains pending.
- The proposed operating entity has not yet been formed. The leading structure is a founder-owned, manager-managed U.S. LLC, while qualified charitable donations remain on an external charitable rail.

The direct rail must remain disabled until provider access, an exact preview, one controlled staging checkout, webhook authentication/replay testing, and all release gates pass.

## 3. Product-theory constraints

The legal and provider architecture should preserve the platform's positive-sum purpose while constraining predictable failure modes:

- Toby Ord distinguishes factual trust from counterfactual trust. Receipts, verification, penalties, and escrow-like arrangements may improve factual performance, but they do not by themselves establish counterfactual additionality.
- Davidson, MacAskill, and Taylor argue that moral public goods face persistent free-rider problems. Their assurance-contract analysis treats dominant-assurance failure payments as only a modest incentive shift, not a general solution.
- MacAskill and Moorhouse emphasize that bargaining outcomes depend on credible commitments, power distribution, collective decision procedures, and protection against value-destroying threats.

Accordingly, Moral Trade should not equate payment completion with moral additionality, overstate what failure bonuses solve, or permit coercive or harmful threats.

## 4. Flow A: direct, non-custodial charitable donation

### Proposed flow

```text
Participant
  -> Every.org-hosted checkout
  -> Every.org receives and processes the donation
  -> Every.org issues the receipt and disburses under its rules
  -> qualified nonprofit or fiscally sponsored project

Every.org partner webhook
  -> Moral Trade verifies exact obligation metadata
  -> Moral Trade records fulfillment or impact credit
```

### Required boundary

Moral Trade must not:

- collect payment credentials;
- be the payee, merchant, or donor of record;
- receive or control the donation;
- change the recipient after commitment;
- combine participants' donations;
- subtract a Moral Trade fee or reserve contribution from charitable principal;
- promise tax deductibility in its own name;
- mark fulfillment from a redirect or browser return alone; or
- claim Every.org endorsement without written authorization.

### Questions for counsel and Every.org

1. Does presenting and tracking a hosted donation link constitute charitable solicitation even when Moral Trade never receives the funds?
2. Is Moral Trade a fundraising counsel, professional solicitor, commercial co-venturer, agent, or another regulated actor?
3. What written authorization is required before using a charity's name, logo, or an implication that the appeal is on its behalf?
4. What point-of-solicitation disclosures must state the legal recipient, tax status, fees, purpose, and role of Moral Trade?
5. May Moral Trade use tax-deductibility language only when Every.org or the qualified organization controls the receipt and confirms eligibility?
6. What partner terms, privacy notices, webhook data limits, and retention rules apply?
7. Does matching or conditional language create a donor benefit, quid pro quo, or commercial-co-venture issue?
8. Must users be told that Moral Trade's impact-credit decision is separate from the receipt and the charity's use of funds?

### Proposed Flow A subtype: Spending Upgrade

The candidate may also present a prospective optional expense as the baseline for a Donation Upgrade. It does not represent that expense as an original charitable donation and does not invent an original nonprofit. Before any match, the candidate stores a private, versioned prospective-spending record. If the baseline is accepted by explicitly scoped evidence-review authority and a counterparty matches, the only funds flows are:

```text
Creator -> separate Every.org-hosted donation -> same upgraded nonprofit
Matcher -> separate Every.org-hosted donation -> same upgraded nonprofit
```

No match creates no donation, checkout, purchase, or impact obligation. Moral Trade does not reimburse or pay the creator. The platform does not receive, combine, split, transfer, or re-donate either participant's funds.

The candidate separates provider-verified donation fulfillment from private review of whether the optional expense was actually cancelled or reduced. Creator “converted spending” credit exists only after both facts pass. A provider-verified matcher donation may remain a factual incremental donation if creator evidence fails, but the whole offer is not displayed as completed.

Counsel and Every.org should additionally determine:

1. whether presenting a donation as conditional on abandoning a prospective optional purchase changes solicitation, donor-benefit, commercial-co-venture, advertising, or provider classification;
2. whether the matching party's knowledge of the creator's promised cancellation could be treated as consideration or a quid pro quo despite no transfer between participants;
3. which claims about “converted spending,” additionality, or counterfactual impact are legally supportable when the donation receipt proves only the donation;
4. which private prospective-purchase and cancellation records may be collected, retained, reviewed, appealed, or deleted;
5. whether reviewer assignment, conflicts, reason codes, and non-public evidence access require additional contractual, privacy, employment, or consumer-dispute controls; and
6. whether the enumerated exclusions and anti-deprivation interface rules are sufficient for a bounded candidate, or whether further categories, age restrictions, limits, cooling-off periods, or warnings are required.

This subtype remains disabled and is not approved for production merely because its migration, tests, or Preview UI pass.

## 5. Flow B: future conditional payments

### Preferred first native architecture: charge after success

```text
Before threshold:
  participant records a non-payment commitment
  no charge, no Moral Trade balance, no transferable wallet

After threshold and final terms:
  participant receives a fresh provider-hosted payment request
  participant affirmatively authorizes the exact amount and recipient
  provider settles under an approved Connect or equivalent configuration
  Moral Trade records signed provider events and applies published rules
```

This minimizes pre-threshold custody. It does not by itself resolve money-transmission, merchant-of-record, solicitation, or processor-eligibility questions.

### Alternative requiring separate approval: pre-authorized mandate

Counsel and the processor must confirm:

- exact amount, recipient, timing, cancellation, and material-change consent;
- off-session charging support for each payment method and jurisdiction;
- merchant-of-record, refund, dispute, and negative-balance allocation;
- recipient onboarding timing; and
- mandate duration and renewal.

### Not approved for initial launch: charge-and-hold

Moral Trade should not initially charge before the threshold and hold proceeds pending release. A processor balance is not necessarily legal escrow. This flow may implicate money transmission, custody, safeguarding, insolvency, unclaimed property, refund timing, and processor restrictions.

### Initial recipient posture

| Recipient class | Initial posture | Issues requiring written resolution |
|---|---|---|
| U.S. 501(c)(3) through Every.org | Use external charitable rail | authorization, solicitation, receipt, matching language, data sharing |
| U.S. nonprofit without deductible status | Separate non-deductible flow | entity status, disclosures, merchant of record, tax characterization |
| For-profit organization | Defer | marketplace role, contract, sales tax, refund rights, KYC/KYB |
| Individual | Defer from first native pilot | KYC, sanctions, tax reporting, income/gift characterization, fraud |
| Informal group | Defer | legal payee, beneficial ownership, bank account, agency, performance responsibility |
| Non-U.S. recipient | Defer | cross-border licensing, sanctions, tax, data, currency, payout support |

The first native pilot should be USD-only, U.S.-only, low-limit, and restricted to verified organizational recipients. It should not include anonymous recipients, stored value, transferable balances, or cross-border payouts.

### Stripe questions

Stripe distinguishes direct charges, destination charges, and separate charges and transfers. Counsel and Stripe should specify:

1. the correct charge type for each recipient class;
2. merchant-of-record status;
3. who bears fees, refunds, chargebacks, and negative balances;
4. whether Moral Trade may delay transfer pending evidence;
5. whether a recipient or amount may change after authorization;
6. whether crowdfunding, charitable fundraising, conditional settlement, or failure bonuses require restricted-business review; and
7. which capabilities and written approvals must exist before launch.

## 6. Dominant assurance contracts and failure bonuses

### Initial permitted source: founder-funded reserve

The proposed initial model is:

```text
Founder capital
  -> separately designated Moral Trade failure-bonus reserve
  -> bonus paid only under frozen, published failure conditions
```

Minimum controls:

- reserve funded before offers are published;
- maximum outstanding exposure never exceeds available reserve;
- reserve separated from charitable principal and recipient payables;
- immutable offer terms identify bonus amount, trigger, deadline, and governing rules;
- no bonus based on a failed browser return or unauthenticated event;
- published fraud, duplicate-account, sanctions, and related-party exclusions;
- refund and chargeback exposure accounted for before bonuses are promised; and
- suspension of new offers when reserve coverage falls below policy.

### Later model requiring separate approval

The founder has considered retaining a disclosed percentage of successful contracts to finance bonuses on unsuccessful contracts. Before implementation, counsel must determine:

- whether the retained amount is a platform fee, reserve contribution, insurance-like premium, prize funding, or another regulated payment;
- whether it may ever be taken from a charitable payment;
- whether an expected bonus affects deductibility or creates quid pro quo treatment;
- whether cross-contract pooling creates fiduciary, trust, safeguarding, insolvency, money-transmission, insurance, gambling, promotion, stored-value, or consumer-credit duties;
- whether state solicitation disclosures must state the exact retained percentage;
- whether the reserve must be restricted, segregated, or held by a third party;
- how refunds, disputes, fraud, and processor reserves affect coverage; and
- how unused reserve assets are treated.

The default product rule is: **no charitable principal may fund failure bonuses**. A later participant-funded reserve should use a separately disclosed, non-charitable checkout and affirmative consent, and should not activate without written legal and processor approval.

## 7. Refund, reversal, and dispute architecture

The written policy must cover at least:

- threshold not reached;
- participant cancellation;
- recipient ineligibility;
- material change to frozen terms;
- missing or rejected evidence;
- harmful, illegal, deceptive, coercive, or sanctioned activity;
- duplicate or erroneous charge;
- provider or bank failure;
- chargeback or ACH return;
- recipient breach;
- platform suspension or insolvency; and
- force majeure.

For every trigger, identify:

- decision-maker and objective evidence;
- notice and appeal rights;
- whether payment is never captured, refunded, transfer-reversed, or recovered;
- who bears processing and dispute fees;
- treatment of platform fees and bonuses;
- deadline for action;
- ledger entries and reconciliation evidence; and
- the authoritative provider event.

A browser success page must never be final authority. Manual overrides should require dual approval, a reason code, and an immutable audit event.

## 8. Recipient onboarding and monitoring

Before any native payout, record and verify:

- legal name, display name, entity type, and jurisdiction;
- government registration or foreign equivalent;
- beneficial owners and control person where required;
- bank account in the recipient's or sponsor's legal name;
- sanctions and prohibited-business screening;
- project purpose and permitted use of funds;
- tax and receipt status;
- provider connected-account identifier and capability state;
- written contract, evidence duties, and refund/recoupment obligation;
- complaint and dispute contact;
- risk rating, limits, and review date; and
- immutable identity hash used in frozen offer terms.

## 9. Accounting and segregation

The books should distinguish:

| Category | Nature | May fund bonuses? |
|---|---|---|
| Founder capital | equity or documented contribution | yes, if designated |
| Operating cash | Moral Trade's own funds | only under approved policy |
| Platform fee revenue | earned under disclosed terms | potentially, after payment-loss exposure |
| Charitable principal | paid directly to qualified charity/intermediary | no |
| Participant funds payable | liability if ever controlled | no, except authorized destination/refund |
| Processor clearing | timing/reconciliation account | no |
| Refund and chargeback reserve | restricted for payment losses | no |
| Failure-bonus reserve | restricted to published bonus obligations | yes |
| Recipient transfer payable | liability to verified recipient | no |
| Unclaimed or returned funds | suspense/liability | no without legal disposition process |

Minimum controls should include daily signed-event ingestion, monthly bank/provider/database reconciliation, immutable transaction identifiers, dual approval above thresholds, no personal-account passthroughs, and retained contracts and receipts.

## 10. Legal questions

### Money transmission

FinCEN treats money-transmission status as fact-dependent. Its payment-processor exclusion is framed around facilitating payment for goods or services or bills through regulated settlement systems and under formal agreement with the seller or creditor. Conditional donations, pooled reserves, and transfers to individuals may not fit automatically.

Ohio Chapter 1315 broadly addresses receiving money from one person and delivering or making it accessible to another, subject to exclusions. Counsel should provide a state-by-state launch rule rather than assuming that Stripe Connect displaces licensing analysis.

### Charitable solicitation

Ohio Chapter 1716 regulates charitable appeals and several fundraising roles, disclosures, records, and misleading representations. Counsel should determine whether Moral Trade's links, matching language, fees, or bonus structure create registration or contractual duties in Ohio or elsewhere.

### Tax and receipting

Only qualified organizations can receive deductible charitable contributions; gifts to individuals are not deductible. When a donor receives or expects a benefit, deductible treatment may be limited and quid pro quo disclosures may apply. Counsel should decide whether a match, failure bonus, platform credit, or other benefit changes the payment's characterization or disclosure.

## 11. Required written conclusions

Please answer **yes**, **no**, or **only if**, cite authority, and state operating conditions:

1. May Flow A launch as a hosted redirect without Moral Trade registering for solicitation?
2. What charity/provider authorization and disclosures are required?
3. Is charge-after-threshold Flow B outside federal and relevant state money-transmitter status?
4. Which state licenses, exemptions, agent structures, or no-action positions are required?
5. Which processor charge type correctly allocates merchant-of-record, refund, and dispute duties?
6. May payment be authorized before the final recipient is known?
7. May transfer be delayed pending evidence without creating custody or escrow treatment?
8. What refund and transfer timelines are lawful and processor-compliant?
9. May verified individuals receive payments, and what KYC/tax/reporting follows?
10. May founder-funded failure bonuses be offered, and under what contract, tax, promotion, or licensing rules?
11. May a separately disclosed participant fee fund a cross-contract reserve?
12. May any portion of a charitable contribution fund that reserve? The proposed default answer is no.
13. What capitalization, segregation, solvency, and unclaimed-property rules apply?
14. Are bonus promises debts, prizes, rebates, insurance-like benefits, or another category?
15. What sanctions, transaction-monitoring, insurance, consumer-term, and privacy controls are required?
16. What facts require renewed legal or provider approval?

## 12. Launch gates

No native payment flow should activate until:

1. entity and beneficial ownership are documented;
2. entity bank account and chart of accounts are operational;
3. written F-1 founder-activity boundary is implemented;
4. written payments and charitable-funds-flow opinion is received;
5. processor gives explicit approval for the exact use case and recipient classes;
6. recipient contracts and KYC/KYB are complete;
7. terms, privacy, refund, dispute, reserve, and harmful-offer policies are approved;
8. state registration/licensing plan is implemented;
9. signed-webhook, replay, idempotency, refund, reversal, and negative-balance tests pass;
10. exact desktop/mobile preview and accessibility gates pass;
11. production remains fail-closed until named approval;
12. low-volume pilot limits, monitoring, reconciliation, incident, and shutdown controls are tested; and
13. post-launch review is scheduled before expanding states, recipients, currencies, or cross-border flows.

## 13. Source boundary

The following product sources motivate the architecture but are not legal authority:

- Toby Ord, **Moral Trade** (2015), especially factual trust, counterfactual trust, verification, penalties, and escrow.
- Davidson, MacAskill, and Taylor, **Moral public goods are a big deal for whether we get a good future** (2026), especially assurance-contract and dominant-assurance-contract analysis.
- MacAskill and Moorhouse, **Convergence and Compromise** (2025), especially threats, power concentration, and collective decision procedures.

Official sources for counsel to verify include FinCEN's payment-processor and agent rulings, 31 C.F.R. 1010.100(ff), Ohio Revised Code Chapters 1315 and 1716, Ohio Attorney General charity-registration guidance, Stripe Connect charge-type and restricted-business documentation, Every.org partner documentation, and IRS charitable-contribution guidance.

## 14. Attachments to provide

- exact product and funds-flow diagrams;
- entity and governance documents;
- Every.org correspondence and proposed partner terms;
- Stripe account and product-review status;
- recipient onboarding form and contract;
- user terms, privacy, refund/dispute, harmful-offer, and reserve policies;
- chart of accounts and sample ledger entries;
- controlled pilot limits;
- webhook schemas and idempotency tests;
- incident and shutdown runbooks; and
- representative user interfaces and disclosures.
