export const dynamic = "force-static";

const REPOSITORY = "ghuser29384/Website2";
const BRANCH = "ops/create-adapter-authenticated-qa-20260728";
const TARGET_HEAD = "edc95a8252a56f7e186fe48e14b51244e792ab73";
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

type Job = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  steps?: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
  }>;
};

type Artifact = {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
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
  const run = (runsResponse.workflow_runs ?? [])
    .filter((candidate) => candidate.name === WORKFLOW_NAME && candidate.head_sha === TARGET_HEAD)
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .at(-1) ?? null;

  let jobs: Job[] = [];
  let artifacts: Artifact[] = [];
  if (run) {
    const [jobsResponse, artifactsResponse] = await Promise.all([
      githubJson<{ jobs?: Job[] }>(
        `/repos/${REPOSITORY}/actions/runs/${run.id}/jobs?per_page=100`,
      ),
      githubJson<{ artifacts?: Artifact[] }>(
        `/repos/${REPOSITORY}/actions/runs/${run.id}/artifacts?per_page=100`,
      ),
    ]);
    jobs = jobsResponse.jobs ?? [];
    artifacts = artifactsResponse.artifacts ?? [];
  }

  const payload = {
    targetHead: TARGET_HEAD,
    workflow: WORKFLOW_NAME,
    run: run && {
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      url: run.html_url,
    },
    jobs: jobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      steps: job.steps,
    })),
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      size: artifact.size_in_bytes,
      expired: artifact.expired,
    })),
  };

  console.log(`CREATE_QA_GATE_COMPACT ${JSON.stringify(payload)}`);

  return (
    <main>
      <h1>Authenticated Create QA gate inspector</h1>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </main>
  );
}
