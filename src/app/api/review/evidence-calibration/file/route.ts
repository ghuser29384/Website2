import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EVIDENCE_BUCKET = "trade-evidence";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFilename(path: string) {
  const candidate = path.split("/").at(-1) || "private-evidence";
  return candidate.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "private-evidence";
}

function errorResponse(status: number, message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    {
      status,
      headers: { "Cache-Control": "no-store, private" },
    },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assignmentId = url.searchParams.get("assignmentId")?.trim() ?? "";
  const itemId = url.searchParams.get("itemId")?.trim() ?? "";
  const itemKind = url.searchParams.get("itemKind")?.trim() ?? "";

  if (
    !UUID_PATTERN.test(assignmentId) ||
    !UUID_PATTERN.test(itemId) ||
    !["evidence_item", "payment_receipt"].includes(itemKind)
  ) {
    return errorResponse(400, "The private evidence request is invalid.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return errorResponse(401, "Sign in before opening private calibration evidence.");
  }

  const { data: permitted, error: permissionError } = await (supabase as any).rpc(
    "can_access_my_evidence_credibility_calibration_file_v1",
    {
      p_assignment_id: assignmentId,
      p_item_id: itemId,
      p_item_kind: itemKind,
    },
  );
  if (permissionError || permitted !== true) {
    return errorResponse(
      403,
      permissionError?.message || "This private evidence item is unavailable to the current reviewer.",
    );
  }

  const service = createServiceClient();
  let storagePath = "";

  if (itemKind === "evidence_item") {
    const { data, error } = await (service as any)
      .from("trade_evidence_bundle_items")
      .select("storage_path,evidence_type")
      .eq("id", itemId)
      .eq("evidence_type", "file")
      .maybeSingle();
    if (error || !data?.storage_path) {
      return errorResponse(404, "The authorized private evidence file is unavailable.");
    }
    storagePath = String(data.storage_path);
  } else {
    const { data, error } = await (service as any)
      .from("trade_external_payment_receipts")
      .select("receipt_storage_path")
      .eq("id", itemId)
      .maybeSingle();
    if (error || !data?.receipt_storage_path) {
      return errorResponse(404, "The authorized private receipt file is unavailable.");
    }
    storagePath = String(data.receipt_storage_path);
  }

  const { data: file, error: downloadError } = await service.storage
    .from(EVIDENCE_BUCKET)
    .download(storagePath);
  if (downloadError || !file) {
    return errorResponse(404, "The authorized private file could not be downloaded.");
  }

  return new Response(await file.arrayBuffer(), {
    status: 200,
    headers: {
      "Cache-Control": "no-store, private, max-age=0",
      "Content-Disposition": `inline; filename="${safeFilename(storagePath)}"`,
      "Content-Type": file.type || "application/octet-stream",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
