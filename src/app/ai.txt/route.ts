import { AI_TXT } from "@/lib/crawlability-assets";

export function GET() {
  return new Response(AI_TXT, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
