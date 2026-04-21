import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  const icon = await readFile(join(process.cwd(), "public", "O (8).png"));

  return new Response(new Uint8Array(icon), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
}
