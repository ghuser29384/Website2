export const dynamic = "force-static";

const REPOSITORY = "ghuser29384/Website2";
const BRANCH = "ops/create-adapter-authenticated-qa-20260728";
const EXPECTED_QA_HEAD = "a2308552eff0fe21f3a9c53c4e51a2d34854c4ae";
const WORKFLOW_NAME = "Authenticated Create adapter isolated-QA release gate";

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
  const workflowRuns = (runsResponse.workflow_runs ?? [])
    .filter((run) => run.name === WORKFLOW_NAME)
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
  const exactRun = workflowRuns.filter((run) => run.head_sha === EXPECTED_QA_HEAD).at(-1) ?? null;

  let jobs: unknown[] = [];
  let artifacts: unknown[] = [];
  if (exactRun) {
    const [jobsResponse, artifactsResponse] = await Promise.all([
      githubJson<{ jobs?: unknown[] }>(
        `/repos/${REPOSITORY}/actions/runs/${exactRun.id}/jobs?per_page=100`,
      ),
      githubJson<{ artifacts?: unknown[] }>(
        `/repos/${REPOSITORY}/actions/runs/${exactRun.id}/artifacts?per_page=100`,
      ),
    ]);
    jobs = jobsResponse.jobs ?? [];
    artifacts = artifactsResponse.artifacts ?? [];
  }

  const payload = {
    expectedQaHead: EXPECTED_QA_HEAD,
    workflowName: WORKFLOW_NAME,
    exactRun,
    jobs,
    artifacts,
    recentWorkflowRuns: workflowRuns.slice(-10),
  };

  console.log(`CREATE_QA_GATE_INSPECTOR ${JSON.stringify(payload)}`);

  return (
    <main>
      <h1>Authenticated Create QA gate inspector</h1>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </main>
  );
}
