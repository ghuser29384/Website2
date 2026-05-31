import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { verifyMpgfEvidenceAccessSignature } from "@/lib/mpgf/public-goods-evidence-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ evidenceRef: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to open MPGF private evidence." }, { status: 401 });
  }

  const { evidenceRef } = await params;
  const url = new URL(request.url);
  const verification = verifyMpgfEvidenceAccessSignature({
    evidenceRef,
    evidenceHash: url.searchParams.get("evidenceHash"),
    expiresAt: url.searchParams.get("expires"),
    scope: url.searchParams.get("scope"),
    signature: url.searchParams.get("sig"),
  });

  if (!verification.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: verification.message,
        status: verification.status,
        privateEvidenceNotReturned: true,
      },
      { status: verification.status === "expired" ? 410 : 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    evidenceRef,
    accessScope: verification.scope,
    signedUrlExpiresAt: verification.expiresAt,
    privateEvidenceNotReturned: true,
    retrievalMode: "owner_or_reviewer_signed_access_only",
  });
}
