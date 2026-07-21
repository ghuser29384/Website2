import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ID = "team_ySu6sF3Uho1E1GnJtCQPVEuJ";

async function probeProjectApi(token: string | undefined, projectId: string | undefined) {
  if (!token || !projectId) {
    return { attempted: false, status: null, errorCode: null };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}?teamId=${encodeURIComponent(TEAM_ID)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    let errorCode: string | null = null;
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { code?: unknown } }
        | null;
      errorCode =
        typeof body?.error?.code === "string" ? body.error.code.slice(0, 80) : null;
    }
    return { attempted: true, status: response.status, errorCode };
  } catch {
    return { attempted: true, status: null, errorCode: "network_error" };
  }
}

export async function GET() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const accessToken = process.env.VERCEL_TOKEN;
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;

  const [accessTokenProbe, oidcProbe] = await Promise.all([
    probeProjectApi(accessToken, projectId),
    probeProjectApi(oidcToken, projectId),
  ]);

  return NextResponse.json(
    {
      projectId: projectId ?? null,
      presence: {
        supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        supabasePublishableKey: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        ),
        unsafePublicServiceRole: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
        ),
        vercelAccessToken: Boolean(accessToken),
        vercelOidcToken: Boolean(oidcToken),
      },
      managementApi: {
        accessToken: accessTokenProbe,
        oidc: oidcProbe,
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
