import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  method: "POST",
  operatorOnly: true,
  state: "not_configured",
  surface: "reviewer_conflict_recusal_records",
});
