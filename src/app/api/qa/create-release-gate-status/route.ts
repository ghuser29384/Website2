import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REPOSITORY = "ghuser29384/Website2";
const BRANCH = "ops/create-adapter-authenticated-qa-20260728";
const WORKFLOW_NAME = "Authenticated Create adapter isolated-QA release gate";
const DEFAULT_QA_HEAD = "a2308552eff0fe21f3a9c53c4e51a2d34854c4ae";

interface WorkflowRun {
  id: number;
  name: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface WorkflowRunsResponse {
  workflow_runs?: WorkflowRun[];
}

interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps?: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
  }>;
}

interface WorkflowJobsResponse {
  jobs?: WorkflowJob[];
}

interface WorkflowArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
  created_at: string;
  expires_at: string;
  archive_download_url: string;
}

interface WorkflowArtifactsResponse {
  artifacts?: WorkflowArtifact[];
}

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "moral-trade-create-release-qa-inspector",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body.slice(0, 500)}`);
  }

  return (await response.json()) as T;
}

export async function GET(request: NextRequest) {
  const requestedSha = request.nextUrl.searchParams.get("sha")?.trim();
  const expectedQaHead = requestedSha || DEFAULT_QA_HEAD;

  if (!/^[0-9a-f]{40}$/.test(expectedQaHead)) {
    return NextResponse.json(
      { ok: false, error: "sha must be a full 40-character lowercase commit SHA." },
      { status: 400 },
    );
  }

  try {
    const runs = await githubJson<WorkflowRunsResponse>(
      `/repos/${REPOSITORY}/actions/runs?branch=${encodeURIComponent(BRANCH)}&event=push&per_page=100`,
    );

    const workflowRuns = (runs.workflow_runs ?? [])
      .filter((run) => run.name === WORKFLOW_NAME)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
    const matchingRuns = workflowRuns.filter(
      (run) => run.head_sha === expectedQaHead,
    );
    const run = matchingRuns.at(-1);

    if (!run) {
      return NextResponse.json(
        {
          ok: false,
          error: "No exact authenticated release-gate run was found.",
          expectedQaHead,
          workflowName: WORKFLOW_NAME,
          recentWorkflowRuns: workflowRuns.slice(-10),
        },
        { status: 404 },
      );
    }

    const [jobs, artifacts] = await Promise.all([
      githubJson<WorkflowJobsResponse>(
        `/repos/${REPOSITORY}/actions/runs/${run.id}/jobs?per_page=100`,
      ),
      githubJson<WorkflowArtifactsResponse>(
        `/repos/${REPOSITORY}/actions/runs/${run.id}/artifacts?per_page=100`,
      ),
    ]);

    return NextResponse.json(
      {
        ok: true,
        expectedQaHead,
        workflowName: WORKFLOW_NAME,
        run,
        jobs: jobs.jobs ?? [],
        artifacts: artifacts.artifacts ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
