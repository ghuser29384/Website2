import { readFile, writeFile } from "node:fs/promises";

const path = "src/app/evidence/[[...recordId]]/page.tsx";
let source = await readFile(path, "utf8");

function replaceOnce(search, replacement, label) {
  const occurrences = source.split(search).length - 1;
  if (occurrences !== 1) throw new Error(`${label}: expected exactly one occurrence, found ${occurrences}`);
  source = source.replace(search, replacement);
}

replaceOnce(
`import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";`,
`import { SiteTopbar } from "@/components/layout/site-topbar";
import { SmartQueryForm } from "@/components/search/smart-query-form";
import { LocalDateTime } from "@/components/ui/local-date-time";`,
"add evidence smart form import",
);

replaceOnce(
`import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";`,
`import { getViewer } from "@/lib/app-data";
import {
  filterAndRankEvidenceRecords,
  type SmartEvidenceSort,
} from "@/lib/smart-evidence-ranking";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  getSmartQueryCauseLabel,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
  serializeSmartQueryFacets,
  type SmartQueryFacets,
} from "@/lib/smart-query";
import {
  hasSmartQueryConstraints,
  mergeSmartQueryFacets,
} from "@/lib/smart-query-facets";
import { loadSmartQueryCausePriorities } from "@/lib/smart-query-personalization";
import { createClient } from "@/lib/supabase/server";`,
"add evidence smart ranking imports",
);

replaceOnce(
`type EvidenceDirectoryData = {
  loadState: "ready" | "unavailable";
  page: number;
  records: EvidenceRecord[];
  totalPages: number;
  totalRecords: number;
};

const DIRECTORY_PAGE_SIZE = 24;`,
`type EvidenceDirectoryData = {
  candidateLimitReached: boolean;
  loadState: "ready" | "unavailable";
  page: number;
  records: EvidenceRecord[];
  totalPages: number;
  totalRecords: number;
};

const DIRECTORY_PAGE_SIZE = 24;
const SMART_EVIDENCE_CANDIDATE_LIMIT = 1_000;
const EVIDENCE_SORT_OPTIONS: ReadonlyArray<{ value: SmartEvidenceSort; label: string }> = [
  { value: "best_match", label: "Best match" },
  { value: "most_verified", label: "Most fully accepted" },
  { value: "challenged", label: "Challenges first" },
  { value: "newest", label: "Newest" },
];`,
"extend evidence directory type",
);

replaceOnce(
`function pageNumber(value: string | string[] | undefined) {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] ?? "" : value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

async function listRecords(page: number): Promise<EvidenceDirectoryData> {
  try {
    const supabase = (await createClient()) as any;
    const from = (page - 1) * DIRECTORY_PAGE_SIZE;
    const { data, error } = await supabase.rpc("list_public_moral_trade_evidence_v1", {
      p_limit: DIRECTORY_PAGE_SIZE,
      p_offset: from,
    });
    if (error) {
      return { loadState: "unavailable", page, records: [], totalPages: 1, totalRecords: 0 };
    }

    const totalRecords = Number(data?.totalRecords ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalRecords / DIRECTORY_PAGE_SIZE));
    if (totalRecords > 0 && page > totalPages) return listRecords(totalPages);
    const records = await hydratePublic(
      Array.isArray(data?.records) ? data.records : [],
      false,
      supabase,
    );
    return { loadState: "ready", page, records, totalPages, totalRecords };
  } catch {
    return { loadState: "unavailable", page, records: [], totalPages: 1, totalRecords: 0 };
  }
}`,
`function pageNumber(value: string | string[] | undefined) {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] ?? "" : value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseEvidenceSort(value: string, hasSmartSearch: boolean): SmartEvidenceSort {
  if (EVIDENCE_SORT_OPTIONS.some((option) => option.value === value)) {
    return value as SmartEvidenceSort;
  }
  return hasSmartSearch ? "best_match" : "newest";
}

function buildEvidenceHref({
  facets,
  page,
  query,
  sort,
}: {
  facets: SmartQueryFacets;
  page?: number;
  query: string;
  sort: SmartEvidenceSort;
}) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
    params.set("smart", "1");
  }
  serializeSmartQueryFacets(params, facets);
  if (sort !== (query || hasSmartQueryConstraints(facets) ? "best_match" : "newest")) {
    params.set("sort", sort);
  }
  if (page && page > 1) params.set("page", String(page));
  return params.size ? \`/evidence?\${params.toString()}\` : "/evidence";
}

async function loadPublicEvidenceCandidates(supabase: any) {
  const rows: Array<Record<string, any>> = [];
  let sourceTotalRecords = 0;
  let offset = 0;

  while (rows.length < SMART_EVIDENCE_CANDIDATE_LIMIT) {
    const requested = Math.min(200, SMART_EVIDENCE_CANDIDATE_LIMIT - rows.length);
    const { data, error } = await supabase.rpc("list_public_moral_trade_evidence_v1", {
      p_limit: requested,
      p_offset: offset,
    });
    if (error) return { error, rows: [], sourceTotalRecords: 0 };
    const batch = Array.isArray(data?.records) ? data.records : [];
    sourceTotalRecords = Number(data?.totalRecords ?? batch.length);
    rows.push(...batch);
    if (!batch.length || rows.length >= sourceTotalRecords) break;
    offset += batch.length;
  }

  return { error: null, rows, sourceTotalRecords };
}

async function listRecords({
  facets,
  page,
  personalPriorities,
  query,
  sort,
}: {
  facets: SmartQueryFacets;
  page: number;
  personalPriorities: readonly string[];
  query: string;
  sort: SmartEvidenceSort;
}): Promise<EvidenceDirectoryData> {
  try {
    const supabase = (await createClient()) as any;
    const smartSearch = Boolean(
      query || hasSmartQueryConstraints(facets) || sort !== "newest",
    );

    if (smartSearch) {
      const candidates = await loadPublicEvidenceCandidates(supabase);
      if (candidates.error) {
        return {
          candidateLimitReached: false,
          loadState: "unavailable",
          page,
          records: [],
          totalPages: 1,
          totalRecords: 0,
        };
      }
      const hydrated = await hydratePublic(candidates.rows, false, supabase);
      const ranked = filterAndRankEvidenceRecords({
        facets,
        personalPriorities,
        query,
        records: hydrated,
        sort,
      });
      const totalRecords = ranked.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / DIRECTORY_PAGE_SIZE));
      if (totalRecords > 0 && page > totalPages) {
        return listRecords({ facets, page: totalPages, personalPriorities, query, sort });
      }
      const from = (page - 1) * DIRECTORY_PAGE_SIZE;
      return {
        candidateLimitReached: candidates.sourceTotalRecords > candidates.rows.length,
        loadState: "ready",
        page,
        records: ranked.slice(from, from + DIRECTORY_PAGE_SIZE),
        totalPages,
        totalRecords,
      };
    }

    const from = (page - 1) * DIRECTORY_PAGE_SIZE;
    const { data, error } = await supabase.rpc("list_public_moral_trade_evidence_v1", {
      p_limit: DIRECTORY_PAGE_SIZE,
      p_offset: from,
    });
    if (error) {
      return {
        candidateLimitReached: false,
        loadState: "unavailable",
        page,
        records: [],
        totalPages: 1,
        totalRecords: 0,
      };
    }

    const totalRecords = Number(data?.totalRecords ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalRecords / DIRECTORY_PAGE_SIZE));
    if (totalRecords > 0 && page > totalPages) {
      return listRecords({ facets, page: totalPages, personalPriorities, query, sort });
    }
    const records = await hydratePublic(
      Array.isArray(data?.records) ? data.records : [],
      false,
      supabase,
    );
    return {
      candidateLimitReached: false,
      loadState: "ready",
      page,
      records,
      totalPages,
      totalRecords,
    };
  } catch {
    return {
      candidateLimitReached: false,
      loadState: "unavailable",
      page,
      records: [],
      totalPages: 1,
      totalRecords: 0,
    };
  }
}`,
"replace evidence directory loader",
);

replaceOnce(
`function Directory({ directory }: { directory: EvidenceDirectoryData }) {
  const { loadState, page, records, totalPages, totalRecords } = directory;
  const visibleEvidenceCount = records.reduce((total, record) => total + record.evidence.length, 0);`,
`function Directory({
  directory,
  facets,
  query,
  sort,
}: {
  directory: EvidenceDirectoryData;
  facets: SmartQueryFacets;
  query: string;
  sort: SmartEvidenceSort;
}) {
  const {
    candidateLimitReached,
    loadState,
    page,
    records,
    totalPages,
    totalRecords,
  } = directory;
  const visibleEvidenceCount = records.reduce((total, record) => total + record.evidence.length, 0);
  const hasFilters = Boolean(query || hasSmartQueryConstraints(facets) || sort !== "newest");
  const activeConstraints = [
    ...facets.causes.map((cause) => \`Cause: \${getSmartQueryCauseLabel(cause)}\`),
    ...facets.evidenceStates.map((value) => \`State: \${value}\`),
    facets.verified === true ? "Fully accepted only" : facets.verified === false ? "Not fully accepted" : null,
  ].filter((value): value is string => Boolean(value));`,
"extend evidence directory component",
);

replaceOnce(
`            <p className={styles.railLabel}>Scope</p>
          <div className={styles.railFact}>`,
`            <p className={styles.railLabel}>Scope</p>
          <div className={styles.railFact}>`,
"assert evidence rail context",
);

replaceOnce(
`            <span className={styles.count}>
              {loadState === "ready"
                ? \`${totalRecords} trade\${totalRecords === 1 ? "" : "s"} with evidence\${records.length ? \` · \${visibleEvidenceCount} item\${visibleEvidenceCount === 1 ? "" : "s"} on this page\` : ""}\`
                : "Evidence temporarily unavailable"}
            </span>
          </div>

          <div className={styles.resultBar}>
            <span><strong>{loadState === "ready" ? totalRecords : "—"}</strong> public trade records</span>
            <span>Public-safe artifacts · newest first</span>
          </div>`,
`            <span className={styles.count}>
              {loadState === "ready"
                ? \`${totalRecords} matching trade\${totalRecords === 1 ? "" : "s"}\${records.length ? \` · \${visibleEvidenceCount} item\${visibleEvidenceCount === 1 ? "" : "s"} on this page\` : ""}\`
                : "Evidence temporarily unavailable"}
            </span>
          </div>

          <SmartQueryForm
            action="/evidence"
            className="panel stack-form"
            method="get"
            queryName="q"
            surface="evidence"
          >
            <div className="field-grid">
              <label className="field">
                <span>Search public evidence</span>
                <input
                  defaultValue={query}
                  name="q"
                  placeholder="e.g. accepted animal-welfare receipts"
                  type="search"
                />
              </label>
              <label className="field">
                <span>Sort</span>
                <select defaultValue={sort} name="sort">
                  {EVIDENCE_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="button button-primary" type="submit">Apply smart search</button>
              {hasFilters ? (
                <Link className="button button-secondary" href="/evidence">Clear search</Link>
              ) : null}
            </div>
            {query || activeConstraints.length ? (
              <div className="tag-row" aria-live="polite">
                {query ? <span className="badge">Query: {query}</span> : null}
                {activeConstraints.map((value) => <span className="badge" key={value}>{value}</span>)}
              </div>
            ) : null}
            <p className="form-help">
              Search is limited to the same public-safe fields shown in this ledger. Private files,
              participant-only notes, identities, challenge evidence, and storage paths are never search inputs.
            </p>
          </SmartQueryForm>

          {candidateLimitReached ? (
            <div className="status-banner" role="status">
              Search ranked the newest {SMART_EVIDENCE_CANDIDATE_LIMIT.toLocaleString()} public-safe records.
              Add a cause or review state to narrow a larger ledger.
            </div>
          ) : null}

          <div className={styles.resultBar}>
            <span><strong>{loadState === "ready" ? totalRecords : "—"}</strong> matching public trade records</span>
            <span>Hard constraints → semantic relevance → accepted evidence → saved cause fit</span>
          </div>`,
"insert evidence smart search form",
);

replaceOnce(
`                  {page > 1 ? <Link href={\`/evidence?page=\${page - 1}\`}>← Newer evidence</Link> : <span />}
                  <span>Page {page} of {totalPages}</span>
                  {page < totalPages ? <Link href={\`/evidence?page=\${page + 1}\`}>Older evidence →</Link> : <span />}`,
`                  {page > 1 ? (
                    <Link href={buildEvidenceHref({ facets, page: page - 1, query, sort })}>← Previous page</Link>
                  ) : <span />}
                  <span>Page {page} of {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={buildEvidenceHref({ facets, page: page + 1, query, sort })}>Next page →</Link>
                  ) : <span />}`,
"preserve evidence query in pagination",
);

replaceOnce(
`                <p className={styles.emptyLabel}>Current ledger</p>
                <h3>No evidence has been submitted yet.</h3>
                <p>
                  There are no real Moral Trade evidence artifacts to list. The interface example
                  below demonstrates the viewer but is not a trade, submission, or evidence record.
                </p>`,
`                <p className={styles.emptyLabel}>{hasFilters ? "Current search" : "Current ledger"}</p>
                <h3>{hasFilters ? "No public evidence satisfies every hard constraint." : "No evidence has been submitted yet."}</h3>
                <p>
                  {hasFilters
                    ? "Broaden the cause, review state, or verification requirement. Missing and private fields are never treated as matches."
                    : "There are no real Moral Trade evidence artifacts to list. The interface example below demonstrates the viewer but is not a trade, submission, or evidence record."}
                </p>`,
"make evidence empty state query-aware",
);

replaceOnce(
`  const id = recordId?.[0];
  const record = id ? await getRecord(id, viewer?.authUser.id ?? null) : null;
  if (id && !record) notFound();
  const directory = id
    ? { loadState: "ready" as const, page: 1, records: [], totalPages: 1, totalRecords: 0 }
    : await listRecords(pageNumber(resolvedSearchParams.page));`,
`  const id = recordId?.[0];
  const record = id ? await getRecord(id, viewer?.authUser.id ?? null) : null;
  if (id && !record) notFound();
  const query = readParam(resolvedSearchParams, "q").trim().slice(0, 500);
  const parsed = parseSmartQuery(query, { surface: "evidence" });
  const facets = mergeSmartQueryFacets(
    parsed.facets,
    parseSerializedSmartQueryFacets(resolvedSearchParams),
  );
  const hasSmartSearch = Boolean(query || hasSmartQueryConstraints(facets));
  const sort = parseEvidenceSort(readParam(resolvedSearchParams, "sort") || facets.sort || "", hasSmartSearch);
  const personalPriorities = await loadSmartQueryCausePriorities(viewer?.authUser.id);
  const directory = id
    ? {
        candidateLimitReached: false,
        loadState: "ready" as const,
        page: 1,
        records: [],
        totalPages: 1,
        totalRecords: 0,
      }
    : await listRecords({
        facets,
        page: pageNumber(resolvedSearchParams.page),
        personalPriorities,
        query,
        sort,
      });`,
"parse evidence query in page",
);

replaceOnce(
`        {record ? <Desk record={record} viewerId={viewer?.authUser.id ?? null} /> : <Directory directory={directory} />}`,
`        {record ? (
          <Desk record={record} viewerId={viewer?.authUser.id ?? null} />
        ) : (
          <Directory directory={directory} facets={facets} query={query} sort={sort} />
        )}`,
"pass evidence query state to directory",
);

await writeFile(path, source, "utf8");
console.log(`Patched ${path}`);
