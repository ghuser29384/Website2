import { buildBackgroundControlRouteHandler } from "@/lib/background-control-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = buildBackgroundControlRouteHandler({
  method: "POST",
  operatorOnly: true,
  state: "disabled_stub",
  surface: "runtime_safety_tripwires",
});
