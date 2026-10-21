# Standalone official charity links MVP

## Scope and release boundary

This change replaces the public `/donate` directory's Every.org widget route with links to reviewed registered charities' own donation landing pages. It does **not** turn the entire application into a donation-only product, activate a live launch, or disable/migrate existing payment systems. This is a draft review change; merging and deployment need separate authorization and the normal runtime release gates.

The directory does not need an account, card, Stripe Connect account, new provider setup, or a database migration. Moral Trade does not collect funds or add a platform fee in this path. Fees or optional recurring gifts on the external site remain subject to that charity's disclosed terms.

Existing payment methods, provider configuration, payment records, Every.org webhooks, conditional payments, trade donation legs, and MPGF/DAC flows are preserved. The directory does not create an agreement, payment intent, pledge, donation record, completion, refund, reward, matching eligibility, or assurance/failure-bonus obligation. It is not a substitute for the evidence those existing workflows require.

The legacy `/donate/confirm` page remains the separately identified Every.org review workflow. Direct charity links do not point to it or supply it with payment evidence. It now explicitly warns that a return URL is not proof.

## Admission and removal

`src/lib/charity-links.ts` is a small, code-reviewed catalog. It deliberately does not import the existing `registered_charities` table, selectable/is_active flags, Every.org target list, or user submissions. No public form or API can mark a destination verified.

Before an operator adds a charity or changes its destination:

1. Open a current official government registration record. Match the **legal entity**, registration number and jurisdiction; check whether the record is active and reporting is current. A website's own nonprofit claim or an evaluator listing is insufficient.
2. Follow the government record's official website link. Follow that site's Donate link and inspect the donation landing page. Confirm it is owned by the named charity. Do not treat Every.org, a fiscal sponsor, a grantmaking intermediary, a personal payee, or a similar-looking domain as that recipient's own page.
3. Record the government record URL, official website, donation URL, official navigation evidence URL, checked date, precise evidence notes, and any country/entity limitations. Do not change recipient identity silently.
4. Set the explicit manual review status only after those checks. Submit the catalog change for review. Suggestions remain absent until independently reviewed.
5. Set expiry no more than 90 days after the checked date. Expiry is exclusive at 00:00 UTC on that date. Recheck all sources to renew; do not merely extend the date. Suspend immediately if the registration, host ownership, legal recipient, or destination changes or cannot be confirmed.

The runtime checks evidence completeness, approved status, source host, strict HTTPS URLs, exact matching official/donation/source hostname, no credentials or custom port, no destination query or fragment, and valid review dates. It is a **manual-review integrity/freshness gate**, not automated verification of the contents of government records. A new registry/jurisdiction or a donation platform on another host requires a reviewed policy/code change; the MVP does not auto-approve it.

The dynamic page filters expired, pending, suspended, future-dated, or incomplete entries on each request and shows a truthful empty state if none qualify. A previously opened browser tab can retain an older link; there is no claim of real-time registration or checkout monitoring.

## Initial source evidence (checked 2026-10-02 UTC)

### The Against Malaria Foundation (suspended; not displayed)

- Legal entity: THE AGAINST MALARIA FOUNDATION, England and Wales charity **1105319**
- [Government contact/registration record](https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/4009810/contact-information) was read live and showed reporting up to date, the entity/number, and website `www.againstmalaria.com`
- [Official homepage](https://www.againstmalaria.com/Default.aspx) links Donate to the [official donation-method landing page](https://www.againstmalaria.com/Donation.aspx)
- The [online form](https://www.againstmalaria.com/Donate.aspx) says choosing the US option routes a gift to The Against Malaria Foundation (US). The directory explicitly discloses this country-specific entity limitation; the UK record is **not** claimed to verify every national AMF entity
- **Admission blocked:** the donation form can select a legal recipient whose registration has not been verified. A disclosure does not substitute for this gate. Keep this record suspended until the relevant actual recipient has matching primary registration evidence and a reviewed donation destination
- Review expiry: 2026-12-31 UTC

### Malaria Consortium (eligible initial listing)

- Legal entity: MALARIA CONSORTIUM, England and Wales charity **1099776**
- [Government contact/registration record](https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/4001828/contact-information?_uk_gov_ccew_onereg_charitydetails_web_portlet_CharityDetailsPortlet_organisationNumber=4001828) was read live and showed reporting up to date, the entity/number, and website `www.malariaconsortium.org`
- [Official homepage](https://www.malariaconsortium.org/) links Make a donation to its [official donation page](https://www.malariaconsortium.org/donate-to-malaria-consortium), which identifies charity 1099776 and offers currency/frequency choices
- Both official-site link traversal and page retrieval succeeded. An additional interactive-browser visit to the donation page timed out; this does not establish an end-to-end checkout pass
- Review expiry: 2026-12-31 UTC

Only Malaria Consortium is initially eligible. The catalog intentionally has one displayed charity rather than silently admitting an unmatched recipient.

These reviews cover registration identity and provenance of the official landing page only. They do not certify impact, partnership/endorsement, global tax deductibility, final country-specific payment recipient, processor reliability, receipts, or refunds. No donor information or payment was submitted. Recheck before a future launch.

## Clicks are not donations

The existing privacy-aware funnel tracker uses `donation_route_clicked` for marked anchors, with:

- `mode: direct_charity_link`
- `routeFamily: charity_directory`
- `resultStatus: donation_unverified`
- `liveMetricEligible: false`

No recipient/user data is appended to the external URL. Links use `noopener noreferrer` and `no-referrer`. Existing analytics opt-out behavior is preserved. Analytics failure never blocks the native link. The event endpoint only stores funnel telemetry; it has no donation, payment or agreement mutation in this path. The public route baseline now classifies `/donate` as directory discovery rather than a completed payment step.

URL query parameters, repeated clicks, coming back, browser Back/Forward, and a donor's unsupported assertion cannot confirm payment. There is no directory self-report button. Do not count clicks as donations, sums raised, verified contributors, trade outcomes, DAC threshold contributions, or reward eligibility.

## Verification plan

- Unit tests: admission/freshness and expiry boundaries; incomplete/suspended records; insecure, intermediary and lookalike destinations; click-only telemetry and sanitization; source wiring isolation
- Browser tests: `/donate` on desktop/mobile, official sources and no setup requirement, forged return parameters, repeated external navigation and close/return, Back/Forward, analytics opt-out, no payment/completion event or non-analytics mutation
- External navigation is intercepted in browser tests so no payment or donor-data submission occurs
- Browser tests show the empty state when all real catalog reviews have expired and skip link-interaction tests until a review is current; unit tests always exercise gate behavior with an explicit review date
- Run full repository tests, lint, TypeScript, and production build; report actual outcomes separately
- Any later authorized release still requires exact deployed-commit verification, canonical route smoke checks, relevant runtime logs, and separate product/legal launch decisions. This implementation does not resolve them
