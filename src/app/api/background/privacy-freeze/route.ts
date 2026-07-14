import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.privacy_freeze.activate",
  laneKey: "privacy_freeze",
  method: "POST",
  state: "existing_surface_elsewhere",
  surface: "privacy_freeze",
});
