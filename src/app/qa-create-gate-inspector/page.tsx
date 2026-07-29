export const dynamic = "force-static";

const REPOSITORY = "ghuser29384/Website2";
const BRANCH = "ops/create-adapter-authenticated-qa-20260728";
const TARGETS = [
  {
    label: "prepare",
    head: "d682e3c0f532868f9e0a218f63dbd1753cb02739",
    workflow: "Prepare integrated Create release QA previews",
  },
  {
    label: "authenticated",
    head: "fef478083c2ce5c69d8c07060e233d0eb343dc21",
    workflow: "Authenticated Create adapter isolated-QA release gate",
  },
] as const;

type Run = {
  id: number;
  name: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
};

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "moral-trade-create-release-qa-build-inspector",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

export default async function QaCreateGateInspectorPage() {
  const runsResponse = await githubJson<{ workflow_runs?: Run[] }>(
    `/repos/${REPOSITORY}/actions/runs?branch=${encodeURIComponent(BRANCH)}&event=push&per_page=100`,
  );
  const allRuns = (runsResponse.workflow_runs ?? []).sort((left, right) =>
    left.created_at.localeCompare(right.created_at),
  );

  const inspections = [];
  for (const target of TARGETS) {
    const run = allRuns
      .filter((candidate) => candidate.name === target.workflow && candidate.head_sha === target.head)
      .at(-1) ?? null;
    let jobs: unknown[] = [];
    let artifacts: unknown[] = [];
    if (run) {
      const [jobsResponse, artifactsResponse] = await Promise.all([
        githubJson<{ jobs?: unknown[] }>(
          `/repos/${REPOSITORY}/actions/runs/${run.id}/jobs?per_page=100`,
        ),
        githubJson<{ artifacts?: unknown[] }>(
          `/repos/${REPOSITORY}/actions/runs/${run.id}/artifacts?per_page=100`,
        ),
      ]);
      jobs = jobsResponse.jobs ?? [];
      artifacts = artifactsResponse.artifacts ?? [];
    }
    inspections.push({ target, run, jobs, artifacts });
  }

  const payload = {
    inspections,
    recentRuns: allRuns.slice(-20),
  };

  console.log(`CREATE_QA_GATE_INSPECTOR ${JSON.stringify(payload)}`);

  return (
    <main>
      <h1>Create release QA inspector</h1>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </main>
  );
}
