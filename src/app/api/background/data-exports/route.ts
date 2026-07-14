import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.participant_export.generate",
  laneKey: "participant_exports",
  method: "POST",
  rateLimitSurface: "profile_portability",
  state: "existing_surface_elsewhere",
  surface: "data_exports",
});
