import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.helper_run.enqueue",
  laneKey: "helper_runs",
  method: "POST",
  state: "existing_surface_elsewhere",
  surface: "delegate_runs",
});
