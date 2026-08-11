#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    source = target.read_text(encoding="utf-8")
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}\n--- old ---\n{old}")
    target.write_text(source.replace(old, new, 1), encoding="utf-8")


def write_new(path: str, content: str) -> None:
    target = ROOT / path
    if target.exists():
        raise SystemExit(f"{path}: refusing to overwrite existing file")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


# Shared, testable page parsing and PostgREST chunking.
write_new(
    "src/lib/public-profile-offers.ts",
    '''export const PUBLIC_PROFILE_OFFERS_PAGE_SIZE = 24;
export const OFFER_HYDRATION_CHUNK_SIZE = 100;

export function parsePublicProfileOfferPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function chunkForPostgrestIn<T>(
  items: readonly T[],
  chunkSize = OFFER_HYDRATION_CHUNK_SIZE,
): T[][] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("PostgREST chunk size must be a positive integer.");
  }

  const chunks: T[][] = [];
  for (let offset = 0; offset < items.length; offset += chunkSize) {
    chunks.push(items.slice(offset, offset + chunkSize));
  }
  return chunks;
}
''',
)

write_new(
    "src/lib/public-profile-offers.test.ts",
    '''import assert from "node:assert/strict";
import test from "node:test";

import {
  chunkForPostgrestIn,
  OFFER_HYDRATION_CHUNK_SIZE,
  parsePublicProfileOfferPage,
  PUBLIC_PROFILE_OFFERS_PAGE_SIZE,
} from "@/lib/public-profile-offers";

test("public profile offer pages fail closed to page one", () => {
  assert.equal(parsePublicProfileOfferPage(undefined), 1);
  assert.equal(parsePublicProfileOfferPage("0"), 1);
  assert.equal(parsePublicProfileOfferPage("-8"), 1);
  assert.equal(parsePublicProfileOfferPage("not-a-page"), 1);
  assert.equal(parsePublicProfileOfferPage(["3", "4"]), 3);
  assert.equal(parsePublicProfileOfferPage("17"), 17);
  assert.equal(PUBLIC_PROFILE_OFFERS_PAGE_SIZE, 24);
});

test("one thousand offers are split into bounded PostgREST filters without loss", () => {
  const offerIds = Array.from({ length: 1_000 }, (_, index) => `offer-${index}`);
  const chunks = chunkForPostgrestIn(offerIds);

  assert.equal(OFFER_HYDRATION_CHUNK_SIZE, 100);
  assert.equal(chunks.length, 10);
  assert.ok(chunks.every((chunk) => chunk.length <= OFFER_HYDRATION_CHUNK_SIZE));
  assert.deepEqual(chunks.flat(), offerIds);
});

test("PostgREST chunking handles empty and partial final chunks", () => {
  assert.deepEqual(chunkForPostgrestIn([]), []);
  assert.deepEqual(chunkForPostgrestIn([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.throws(() => chunkForPostgrestIn([1], 0), RangeError);
});
''',
)

write_new(
    "src/lib/public-profile-scale-contract.test.ts",
    '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appData = readFileSync("src/lib/app-data.ts", "utf8");
const profilePage = readFileSync("src/app/people/[profileId]/page.tsx", "utf8");
const credibilityPage = readFileSync(
  "src/app/people/[profileId]/credibility/page.tsx",
  "utf8",
);
const credibilityApi = readFileSync(
  "src/app/api/credibility/profile/[profileId]/route.ts",
  "utf8",
);

test("credibility surfaces use the lightweight profile summary path", () => {
  assert.match(credibilityApi, /getPublicProfileSummary/);
  assert.doesNotMatch(credibilityApi, /getPublicProfilePageData/);
  assert.match(credibilityPage, /getPublicProfileSummary/);
  assert.doesNotMatch(credibilityPage, /getPublicProfilePageData/);
});

test("public profiles use bounded offer pages with truthful navigation", () => {
  assert.match(appData, /listPublicProfileOffersPage/);
  assert.match(appData, /\.range\(offset, offset \+ pageSize\)/);
  assert.match(appData, /offersPage: PaginatedResult<OfferRecord>/);
  assert.match(profilePage, /parsePublicProfileOfferPage/);
  assert.match(profilePage, /data\.offersPage\.hasNextPage/);
  assert.match(profilePage, /Showing \{/);
  assert.match(profilePage, /id="open-offers"/);
});

test("all offer hydration passes through bounded PostgREST chunks", () => {
  assert.match(appData, /chunkForPostgrestIn\(offers\)/);
  assert.match(appData, /hydrateOffersChunk\(offerChunk, viewerId\)/);
  assert.equal((appData.match(/async function hydrateOffersChunk/g) ?? []).length, 1);
});
''',
)

# app-data: import helper and extend the page-data contract.
replace_once(
    "src/lib/app-data.ts",
    'import { isMissingOptionalLegacyAgreementRelation } from "@/lib/optional-legacy-agreement-relations";\n',
    'import { isMissingOptionalLegacyAgreementRelation } from "@/lib/optional-legacy-agreement-relations";\nimport {\n  chunkForPostgrestIn,\n  PUBLIC_PROFILE_OFFERS_PAGE_SIZE,\n} from "@/lib/public-profile-offers";\n',
)
replace_once(
    "src/lib/app-data.ts",
    '''export interface PublicProfilePageData {
  profile: PublicProfileSummary | null;
  offers: OfferRecord[];
  profileRecommendations: OfferRecommendationRecord[];
  authoredCommentCount: number;
}
''',
    '''export interface PublicProfilePageData {
  profile: PublicProfileSummary | null;
  offers: OfferRecord[];
  offersPage: PaginatedResult<OfferRecord>;
  profileRecommendations: OfferRecommendationRecord[];
  authoredCommentCount: number;
}
''',
)

# app-data: add a lightweight profile loader and ensure every hydration query is bounded.
replace_once(
    "src/lib/app-data.ts",
    '''async function hydrateOffers(
  offers: OfferRow[],
  viewerId?: string | null,
): Promise<OfferRecord[]> {
''',
    '''export async function getPublicProfileSummary(
  profileId: string,
  viewerId?: string | null,
) {
  const profileMap = await getProfileSummaryMap(viewerId, [profileId]);
  return profileMap.get(profileId) ?? null;
}

async function hydrateOffers(
  offers: OfferRow[],
  viewerId?: string | null,
): Promise<OfferRecord[]> {
  const hydrated: OfferRecord[] = [];
  for (const offerChunk of chunkForPostgrestIn(offers)) {
    hydrated.push(...(await hydrateOffersChunk(offerChunk, viewerId)));
  }
  return hydrated;
}

async function hydrateOffersChunk(
  offers: OfferRow[],
  viewerId?: string | null,
): Promise<OfferRecord[]> {
''',
)

# app-data: retain the existing unbounded portfolio loader, but make the public surface paginated.
replace_once(
    "src/lib/app-data.ts",
    '''export async function listProfileOffers(profileId: string, viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("owner_id", profileId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return hydrateOffers((data ?? []) as OfferRow[], viewerId);
}

export async function getPublicProfilePageData(profileId: string, viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return {
      profile: null,
      offers: [],
      profileRecommendations: [],
      authoredCommentCount: 0,
    } satisfies PublicProfilePageData;
  }

  const supabase = await createClient();
  const [profileMap, offers, recommendations, { data: comments, error: commentsError }] =
    await Promise.all([
      getProfileSummaryMap(viewerId, [profileId]),
      listProfileOffers(profileId, viewerId),
      listProfileRecommendations(profileId),
      supabase.from("offer_comments").select("*").eq("author_id", profileId),
    ]);

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  return {
    profile: profileMap.get(profileId) ?? null,
    offers,
    profileRecommendations: recommendations,
    authoredCommentCount: (comments ?? []).length,
  } satisfies PublicProfilePageData;
}
''',
    '''export async function listProfileOffers(profileId: string, viewerId?: string | null) {
  if (!hasSupabaseEnv()) {
    return [] as OfferRecord[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("owner_id", profileId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return hydrateOffers((data ?? []) as OfferRow[], viewerId);
}

export async function listPublicProfileOffersPage(
  profileId: string,
  viewerId?: string | null,
  page = 1,
  pageSize = PUBLIC_PROFILE_OFFERS_PAGE_SIZE,
): Promise<PaginatedResult<OfferRecord>> {
  const normalizedPage = normalizePage(page);
  if (!hasSupabaseEnv()) {
    return buildPaginatedResult([], normalizedPage, pageSize);
  }

  const offset = (normalizedPage - 1) * pageSize;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("owner_id", profileId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + pageSize);

  if (error) {
    throw new Error(error.message);
  }

  const hydrated = await hydrateOffers((data ?? []) as OfferRow[], viewerId);
  return buildPaginatedResult(hydrated, normalizedPage, pageSize);
}

export async function getPublicProfilePageData(
  profileId: string,
  viewerId?: string | null,
  requestedOfferPage = 1,
) {
  const requestedPage = normalizePage(requestedOfferPage);
  if (!hasSupabaseEnv()) {
    return {
      profile: null,
      offers: [],
      offersPage: buildPaginatedResult([], requestedPage, PUBLIC_PROFILE_OFFERS_PAGE_SIZE),
      profileRecommendations: [],
      authoredCommentCount: 0,
    } satisfies PublicProfilePageData;
  }

  const profile = await getPublicProfileSummary(profileId, viewerId);
  if (!profile) {
    return {
      profile: null,
      offers: [],
      offersPage: buildPaginatedResult([], requestedPage, PUBLIC_PROFILE_OFFERS_PAGE_SIZE),
      profileRecommendations: [],
      authoredCommentCount: 0,
    } satisfies PublicProfilePageData;
  }

  const maximumPage = Math.max(
    1,
    Math.ceil(profile.offerCount / PUBLIC_PROFILE_OFFERS_PAGE_SIZE),
  );
  const offerPage = Math.min(requestedPage, maximumPage);
  const supabase = await createClient();
  const [offersPage, recommendations, commentsResult] = await Promise.all([
    listPublicProfileOffersPage(profileId, viewerId, offerPage),
    listProfileRecommendations(profileId),
    supabase
      .from("offer_comments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profileId),
  ]);

  if (commentsResult.error) {
    throw new Error(commentsResult.error.message);
  }

  return {
    profile,
    offers: offersPage.items,
    offersPage,
    profileRecommendations: recommendations,
    authoredCommentCount: commentsResult.count ?? 0,
  } satisfies PublicProfilePageData;
}
''',
)

# Credibility API: profile identity must not trigger offer hydration.
replace_once(
    "src/app/api/credibility/profile/[profileId]/route.ts",
    'import { getPublicProfilePageData } from "@/lib/app-data";\n',
    'import { getPublicProfileSummary } from "@/lib/app-data";\n',
)
replace_once(
    "src/app/api/credibility/profile/[profileId]/route.ts",
    '''  const profileData = await getPublicProfilePageData(profileId);
  if (!profileData.profile) {
''',
    '''  const profile = await getPublicProfileSummary(profileId);
  if (!profile) {
''',
)
replace_once(
    "src/app/api/credibility/profile/[profileId]/route.ts",
    '''      id: profileData.profile.id,
      displayName: profileData.profile.resolvedName,
''',
    '''      id: profile.id,
      displayName: profile.resolvedName,
''',
)

# Credibility page and metadata: use the same lightweight profile path.
replace_once(
    "src/app/people/[profileId]/credibility/page.tsx",
    'import { formatPublicProfileLocation, getPublicProfilePageData, getViewer } from "@/lib/app-data";\n',
    'import { formatPublicProfileLocation, getPublicProfileSummary, getViewer } from "@/lib/app-data";\n',
)
replace_once(
    "src/app/people/[profileId]/credibility/page.tsx",
    '''  const data = await getPublicProfilePageData(profileId);

  return {
    title: data.profile ? `${data.profile.resolvedName} credibility` : "Profile credibility",
    description: data.profile
      ? truncateDescription(
          `Context-specific transaction reliability and evidence confidence for ${data.profile.resolvedName}.`,
        )
''',
    '''  const profile = await getPublicProfileSummary(profileId);

  return {
    title: profile ? `${profile.resolvedName} credibility` : "Profile credibility",
    description: profile
      ? truncateDescription(
          `Context-specific transaction reliability and evidence confidence for ${profile.resolvedName}.`,
        )
''',
)
replace_once(
    "src/app/people/[profileId]/credibility/page.tsx",
    '''      title: data.profile ? `${data.profile.resolvedName} credibility` : "Profile credibility",
''',
    '''      title: profile ? `${profile.resolvedName} credibility` : "Profile credibility",
''',
)
replace_once(
    "src/app/people/[profileId]/credibility/page.tsx",
    '''  const [viewer, data, summary] = await Promise.all([
    getViewer(),
    getPublicProfilePageData(profileId),
    getPublicCredibilitySummary(profileId, { role, category }),
  ]);

  if (!data.profile) {
    notFound();
  }

  const profile = data.profile;
''',
    '''  const [viewer, profile, summary] = await Promise.all([
    getViewer(),
    getPublicProfileSummary(profileId),
    getPublicCredibilitySummary(profileId, { role, category }),
  ]);

  if (!profile) {
    notFound();
  }

''',
)

# Public profile metadata and route: lightweight metadata plus explicit paginated offer navigation.
replace_once(
    "src/app/people/[profileId]/page.tsx",
    '''import {
  formatPublicProfileLocation,
  getPublicProfilePageData,
  getViewer,
  listRecommendableOffers,
} from "@/lib/app-data";
''',
    '''import {
  formatPublicProfileLocation,
  getPublicProfilePageData,
  getPublicProfileSummary,
  getViewer,
  listRecommendableOffers,
} from "@/lib/app-data";
''',
)
replace_once(
    "src/app/people/[profileId]/page.tsx",
    'import { hasSupabaseEnv } from "@/lib/supabase/config";\n',
    'import { parsePublicProfileOfferPage } from "@/lib/public-profile-offers";\n',
)
replace_once(
    "src/app/people/[profileId]/page.tsx",
    '''  if (!hasSupabaseEnv()) {
    return {
      title: "Profile",
    };
  }

  const data = await getPublicProfilePageData(profileId);

  return {
    title: data.profile ? data.profile.resolvedName : "Profile",
    description: data.profile
      ? truncateDescription(
          getPublicProfileMetaSummary(data.profile, {
            publicLocation: formatPublicProfileLocation(data.profile),
          }),
        )
      : "Public Moral Trade member profile.",
''',
    '''  const profile = await getPublicProfileSummary(profileId);

  return {
    title: profile ? profile.resolvedName : "Profile",
    description: profile
      ? truncateDescription(
          getPublicProfileMetaSummary(profile, {
            publicLocation: formatPublicProfileLocation(profile),
          }),
        )
      : "Public Moral Trade member profile.",
''',
)
replace_once(
    "src/app/people/[profileId]/page.tsx",
    '''      title: data.profile ? data.profile.resolvedName : "Profile",
      description: data.profile
        ? truncateDescription(
            getPublicProfileMetaSummary(data.profile, {
              publicLocation: formatPublicProfileLocation(data.profile),
            }),
          )
''',
    '''      title: profile ? profile.resolvedName : "Profile",
      description: profile
        ? truncateDescription(
            getPublicProfileMetaSummary(profile, {
              publicLocation: formatPublicProfileLocation(profile),
            }),
          )
''',
)
replace_once(
    "src/app/people/[profileId]/page.tsx",
    '''  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = await getViewer();
  const data = hasSupabaseEnv()
    ? await getPublicProfilePageData(profileId, viewer?.authUser.id)
    : {
        profile: null,
        offers: [],
        profileRecommendations: [],
        authoredCommentCount: 0,
      };
''',
    '''  const formMessage = getFormMessage(resolvedSearchParams);
  const offerPage = parsePublicProfileOfferPage(resolvedSearchParams.offersPage);
  const viewer = await getViewer();
  const data = await getPublicProfilePageData(profileId, viewer?.authUser.id, offerPage);
''',
)
replace_once(
    "src/app/people/[profileId]/page.tsx",
    '''  const profile = data.profile;
  const isOwnProfile = viewer?.authUser.id === profile.id;
''',
    '''  const profile = data.profile;
  const visibleOfferStart = data.offers.length
    ? (data.offersPage.page - 1) * data.offersPage.pageSize + 1
    : 0;
  const visibleOfferEnd = visibleOfferStart + data.offers.length - 1;
  const isOwnProfile = viewer?.authUser.id === profile.id;
''',
)
replace_once(
    "src/app/people/[profileId]/page.tsx",
    '''        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Open offers</p>
            <h2>Public commitments from this member</h2>
          </div>
''',
    '''        <section className="section section-subtle" id="open-offers">
          <div className="section-head">
            <p className="eyebrow">Open offers</p>
            <h2>Public commitments from this member</h2>
            <p>
              {data.offers.length
                ? `Showing ${visibleOfferStart}–${visibleOfferEnd} of ${profile.offerCount} open offers.`
                : "No open offers are visible on this page."}
            </p>
          </div>
''',
)
replace_once(
    "src/app/people/[profileId]/page.tsx",
    '''          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Profile recommendations</p>
''',
    '''          </div>

          {data.offersPage.hasPreviousPage || data.offersPage.hasNextPage ? (
            <nav aria-label="Open-offer pages" className="offer-actions">
              {data.offersPage.hasPreviousPage ? (
                <Link
                  className="button button-secondary"
                  href={`/people/${profile.id}?offersPage=${data.offersPage.page - 1}#open-offers`}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <span className="source-pill">Page {data.offersPage.page}</span>
              {data.offersPage.hasNextPage ? (
                <Link
                  className="button button-secondary"
                  href={`/people/${profile.id}?offersPage=${data.offersPage.page + 1}#open-offers`}
                >
                  Next page
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Profile recommendations</p>
''',
)

print("Applied issue #609 public-profile scale hotfix.")
