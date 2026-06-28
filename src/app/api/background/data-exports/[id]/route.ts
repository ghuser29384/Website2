import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = buildBackgroundControlRouteHandler({
  method: "GET",
  rateLimitSurface: "profile_portability",
  state: "read_only_status",
  surface: "data_export_status",
});
