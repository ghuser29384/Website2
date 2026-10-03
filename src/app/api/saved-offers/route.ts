import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isPostgresUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

async function readOfferId(request: Request) {
  try {
    const body = (await request.json()) as { offerId?: unknown };
    const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
    return isPostgresUuid(offerId) ? offerId : null;
  } catch {
    return null;
  }
}

async function requireViewer() {
  if (!hasSupabaseEnv()) return null;
  return getViewer();
}

export async function POST(request: Request) {
  const viewer = await requireViewer();
  if (!viewer) return privateJson({ authenticated: false, saved: false }, 401);

  const offerId = await readOfferId(request);
  if (!offerId) return privateJson({ error: "A valid offer ID is required." }, 400);

  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError) return privateJson({ error: "The offer could not be checked." }, 503);
  if (!offer || offer.status !== "open") {
    return privateJson({ error: "This offer is not currently saveable." }, 404);
  }
  if (offer.owner_id === viewer.authUser.id) {
    return privateJson({ error: "You cannot save your own offer." }, 409);
  }

  const { data: existing, error: existingError } = await supabase
    .from("offer_carts")
    .select("offer_id")
    .eq("offer_id", offerId)
    .eq("user_id", viewer.authUser.id)
    .maybeSingle();

  if (existingError) return privateJson({ error: "Saved-item state could not be checked." }, 503);
  if (!existing) {
    const { error } = await supabase.from("offer_carts").insert({
      offer_id: offerId,
      user_id: viewer.authUser.id,
    });
    if (error) return privateJson({ error: "The offer could not be saved." }, 503);
  }

  return privateJson({ authenticated: true, offerId, saved: true });
}

export async function DELETE(request: Request) {
  const viewer = await requireViewer();
  if (!viewer) return privateJson({ authenticated: false, saved: false }, 401);

  const offerId = await readOfferId(request);
  if (!offerId) return privateJson({ error: "A valid offer ID is required." }, 400);

  const supabase = await createClient();
  const { error } = await supabase
    .from("offer_carts")
    .delete()
    .eq("offer_id", offerId)
    .eq("user_id", viewer.authUser.id);

  if (error) return privateJson({ error: "The saved offer could not be removed." }, 503);
  return privateJson({ authenticated: true, offerId, saved: false });
}
