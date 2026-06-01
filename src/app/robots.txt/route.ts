import { ROBOTS_TXT } from "@/lib/crawlability-assets";

export function GET() {
  return new Response(ROBOTS_TXT, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
