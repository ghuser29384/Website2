import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { createMpgfRealMoneyCheckout, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function amountDollars(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const record = payload as Record<string, unknown>;
  const cents = Number(record.amountCents);

  if (Number.isInteger(cents) && cents > 0) {
    return cents / 100;
  }

  const dollars = Number(record.amountDollars);

  return Number.isFinite(dollars) ? dollars : 0;
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to create an MPGF checkout session." }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => null);
    const result = await createMpgfRealMoneyCheckout({
      userId: viewer.authUser.id,
      displayName: viewer.displayName,
      email: viewer.authUser.email,
      amountDollars: amountDollars(payload),
      cadence: "one_time",
    });

    return NextResponse.json(
      {
        ...result,
        checkoutMode: "payment",
        manualEvidenceFallback: true,
        finalPayoutAuthorized: false,
      },
      { status: result.ok ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Could not create MPGF checkout session.",
        readiness: await loadMpgfRealMoneyReadiness(),
      },
      { status: 400 },
    );
  }
}
