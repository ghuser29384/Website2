/**
 * Manually reviewed, recipient-owned links for the standalone /donate directory.
 * This is deliberately separate from registered_charities, Every.org targets,
 * payment destinations, trade terms, and MPGF/DAC accounting.
 */
export interface CharityLink {
  id: string;
  legalName: string;
  causeArea: string;
  summary: string;
  websiteUrl: string;
  donationUrl: string;
  registration: {
    authority: "Charity Commission for England and Wales";
    number: string;
    jurisdiction: "England and Wales";
    sourceUrl: string;
  };
  review: {
    status: "approved" | "pending" | "suspended";
    checkedOn: string;
    expiresOn: string;
    ownershipSourceUrl: string;
    evidence: string;
    recipientNote: string;
  };
}

export const CHARITY_LINK_MODE = "direct_charity_link" as const;
const MAX_REVIEW_AGE_MS = 90 * 24 * 60 * 60 * 1_000;

// Only a reviewed repository change may add or approve a destination. Neither
// user-submitted URLs nor the older selectable/is_active flags enter this list.
export const REVIEWED_CHARITY_LINKS: readonly CharityLink[] = [
  {
    id: "against-malaria-foundation-uk",
    legalName: "The Against Malaria Foundation",
    causeArea: "Malaria prevention",
    summary: "Supports malaria prevention through insecticide-treated mosquito nets.",
    websiteUrl: "https://www.againstmalaria.com/",
    donationUrl: "https://www.againstmalaria.com/Donation.aspx",
    registration: {
      authority: "Charity Commission for England and Wales",
      number: "1105319",
      jurisdiction: "England and Wales",
      sourceUrl: "https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/4009810/contact-information",
    },
    review: {
      status: "suspended",
      checkedOn: "2026-10-02",
      expiresOn: "2026-12-31",
      ownershipSourceUrl: "https://www.againstmalaria.com/Default.aspx",
      evidence: "The regulator record identifies THE AGAINST MALARIA FOUNDATION, charity 1105319, reporting up to date, and links www.againstmalaria.com. The official homepage links Donation.aspx as Donate. SUSPENDED: the country-selected actual recipient is not fully matched to the reviewed UK registration; reverify the relevant recipient before enabling.",
      recipientNote: "The registration shown is for the England and Wales charity. Its online form may select another national entity for your country, including AMF (US) for US donors. Check that recipient and its receipt terms before paying; other national entities are not verified by this listing.",
    },
  },
  {
    id: "malaria-consortium-uk",
    legalName: "Malaria Consortium",
    causeArea: "Malaria and disease prevention",
    summary: "Works to prevent and treat malaria and other communicable diseases.",
    websiteUrl: "https://www.malariaconsortium.org/",
    donationUrl: "https://www.malariaconsortium.org/donate-to-malaria-consortium",
    registration: {
      authority: "Charity Commission for England and Wales",
      number: "1099776",
      jurisdiction: "England and Wales",
      sourceUrl: "https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/4001828/contact-information?_uk_gov_ccew_onereg_charitydetails_web_portlet_CharityDetailsPortlet_organisationNumber=4001828",
    },
    review: {
      status: "approved",
      checkedOn: "2026-10-02",
      expiresOn: "2026-12-31",
      ownershipSourceUrl: "https://www.malariaconsortium.org/",
      evidence: "The regulator record identifies MALARIA CONSORTIUM, charity 1099776, reporting up to date, and links www.malariaconsortium.org. The official homepage links donate-to-malaria-consortium as Make a donation.",
      recipientNote: "The registration shown is for the England and Wales charity. Review the charity's destination, payment options, and country-specific receipt terms on its donation page.",
    },
  },
];

function parseHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      ? url
      : null;
  } catch {
    return null;
  }
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
    ? time
    : NaN;
}

/** Structural/freshness gate for manual review evidence; not an automated verifier. */
export function isEligibleCharityLink(charity: CharityLink, now: Date) {
  const website = parseHttpsUrl(charity.websiteUrl);
  const donation = parseHttpsUrl(charity.donationUrl);
  const ownershipSource = parseHttpsUrl(charity.review.ownershipSourceUrl);
  const registration = parseHttpsUrl(charity.registration.sourceUrl);
  const checkedAt = parseDate(charity.review.checkedOn);
  const expiresAt = parseDate(charity.review.expiresOn);
  const nowMs = now.getTime();

  return Boolean(
    charity.id.trim() && charity.legalName.trim() &&
    charity.review.status === "approved" &&
    charity.review.evidence.trim() && charity.review.recipientNote.trim() &&
    charity.registration.authority === "Charity Commission for England and Wales" &&
    charity.registration.jurisdiction === "England and Wales" &&
    /^\d{6,8}$/.test(charity.registration.number) &&
    registration?.hostname === "register-of-charities.charitycommission.gov.uk" &&
    registration.pathname.includes("/charity-search/-/charity-details/") &&
    website && donation && ownershipSource &&
    // Start on the reviewed charity's exact own host, never a fundraising
    // intermediary, arbitrary redirect service, or lookalike subdomain.
    donation.hostname === website.hostname &&
    ownershipSource.hostname === website.hostname &&
    !donation.search && !donation.hash &&
    Number.isFinite(nowMs) && checkedAt <= nowMs && nowMs < expiresAt &&
    expiresAt > checkedAt && expiresAt - checkedAt <= MAX_REVIEW_AGE_MS
  );
}

export function getEligibleCharityLinks(now = new Date()) {
  return REVIEWED_CHARITY_LINKS.filter((charity) => isEligibleCharityLink(charity, now));
}

/** Reuse click telemetry only. This must never be used as a donation receipt. */
export function getCharityLinkClickMetadata() {
  return {
    mode: CHARITY_LINK_MODE,
    routeFamily: "charity_directory",
    resultStatus: "donation_unverified",
    liveMetricEligible: false,
  } as const;
}
