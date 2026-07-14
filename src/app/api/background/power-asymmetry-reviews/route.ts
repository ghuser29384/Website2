import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  method: "POST",
  operatorOnly: true,
  state: "not_configured",
  surface: "power_asymmetry_reviews",
});
