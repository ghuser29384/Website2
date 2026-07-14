import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.delegate_authorization.write",
  laneKey: "delegate_authorizations",
  method: "POST",
  state: "existing_surface_elsewhere",
  surface: "delegate_authorization_revoke",
});
