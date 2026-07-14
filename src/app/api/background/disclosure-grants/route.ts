import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  actionKind: "background.exact_disclosure.grant",
  laneKey: "exact_disclosure",
  method: "POST",
  state: "disabled_stub",
  surface: "disclosure_grants",
});
