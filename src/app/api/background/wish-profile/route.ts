import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.wish_profile.apply",
  laneKey: "structured_wish_profile",
  method: "POST",
  state: "existing_surface_elsewhere",
  surface: "wish_profile",
});
