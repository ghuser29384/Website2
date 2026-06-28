import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.federation_bridge.export",
  actorRole: "admin",
  laneKey: "federation_bridge",
  method: "POST",
  operatorOnly: true,
  state: "disabled_stub",
  surface: "federation_bridge_grants",
});
