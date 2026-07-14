import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.structured_wish_interview.answer",
  laneKey: "structured_wish_interview",
  method: "POST",
  state: "existing_surface_elsewhere",
  surface: "wish_interview",
});
