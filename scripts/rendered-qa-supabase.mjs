import { readFile } from "node:fs/promises";
import http from "node:http";

const host = process.env.RENDERED_QA_SUPABASE_HOST ?? "127.0.0.1";
const port = Number(process.env.RENDERED_QA_SUPABASE_PORT ?? "3230");
const fixturePath = process.env.RENDERED_QA_OFFERS_FIXTURE;

if (!fixturePath) {
  throw new Error("RENDERED_QA_OFFERS_FIXTURE must point to a captured public Offers response.");
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
if (!Array.isArray(fixture.items) || !Number.isInteger(fixture.total) || fixture.items.length === 0) {
  throw new Error("Rendered QA Offers fixture must contain non-empty items and an integer total.");
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);

  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("rendered-qa-ready");
    return;
  }

  if (request.method === "GET" && url.pathname === "/rest/v1/offers") {
    response.writeHead(206, {
      "content-range": `0-${fixture.items.length - 1}/${fixture.total}`,
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(fixture.items));
    return;
  }

  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ message: "Rendered QA endpoint not found." }));
});

server.listen(port, host, () => {
  process.stdout.write(
    `Rendered QA Supabase ready at http://${host}:${port} with ${fixture.items.length}/${fixture.total} public Offers rows.\n`,
  );
});
