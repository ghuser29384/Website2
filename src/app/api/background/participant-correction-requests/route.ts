import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  method: "POST",
  state: "not_configured",
  surface: "participant_correction_requests",
});
