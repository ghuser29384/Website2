import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.candidate_exposure.update",
  laneKey: "candidate_exposure",
  method: "POST",
  state: "existing_surface_elsewhere",
  surface: "candidate_exposure",
});
