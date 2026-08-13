import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ICON_PATH = join(process.cwd(), "public", "brand", "moral-trade-mark.png");

export async function GET() {
  const icon = await readFile(ICON_PATH);

  return new Response(new Uint8Array(icon), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "image/png",
    },
  });
}
