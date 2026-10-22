import { gunzipSync } from "node:zlib";

const BUNDLE_URL = "https://raw.githubusercontent.com/ghuser29384/RL-for-Conceptual-Reasoning/2176df9ae5264b3e38ad8f8d049caf53d8a4a38f/ops/release-bundles/metaphilosophy-public-editorial-a0273b4.tgz.b64";
const BUNDLE_SHA256 = "ea4d1d252c3a0cd18d305554c0b2b44fab59c3f19d48eea56b737e81931f0044";
const RELEASE_MARKER = "mp-public-voice-20260806-r1";
let filesPromise;

const ROUTES = new Map([
  ["/", "dist/index.html"],
  ["/index.html", "dist/index.html"],
  ["/research", "dist/research/index.html"],
  ["/research/", "dist/research/index.html"],
  ["/arguments", "dist/arguments/index.html"],
  ["/arguments/", "dist/arguments/index.html"],
  ["/reviewers", "dist/reviewers/closed.html"],
  ["/reviewers/", "dist/reviewers/closed.html"],
  ["/reviewers/index.html", "dist/reviewers/closed.html"],
  ["/contribute", "dist/reviewers/closed.html"],
  ["/contribute/", "dist/reviewers/closed.html"],
  ["/workspace", "dist/index.html"],
  ["/workspace/", "dist/index.html"],
  ["/reference", "dist/index.html"],
  ["/reference/", "dist/index.html"],
]);

export default async function handler(req, res) {
  const requestUrl = new URL(req.url || "/", "https://www.metaphilosophy.org");
  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    return sendText(res, 400, "Bad request");
  }

  if (pathname === "/src/assets/LMCA_dataset.pdf") {
    res.statusCode = 307;
    res.setHeader("Location", "https://arxiv.org/pdf/2607.27499");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.end();
  }

  let files;
  try {
    files = await getFiles();
  } catch (error) {
    console.error("public_bundle_load_failed", error);
    return sendText(res, 503, "Public release temporarily unavailable");
  }

  const mapped = ROUTES.get(pathname) || `dist/${pathname.replace(/^\/+/, "")}`;
  if (!mapped || mapped.includes("..") || !files.has(mapped)) {
    return sendText(res, 404, "Not found");
  }

  const body = files.get(mapped);
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType(mapped));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-Metaphilosophy-Release", RELEASE_MARKER);
  res.setHeader("X-Metaphilosophy-Bundle-SHA256", BUNDLE_SHA256);
  res.setHeader(
    "Cache-Control",
    mapped.endsWith(".html")
      ? "public, max-age=0, must-revalidate"
      : "public, max-age=3600, stale-while-revalidate=86400",
  );
  if (req.method === "HEAD") return res.end();
  return res.end(body);
}

async function getFiles() {
  if (!filesPromise) {
    filesPromise = fetch(BUNDLE_URL, { headers: { "User-Agent": "Metaphilosophy-Release/1" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Bundle fetch returned ${response.status}`);
        const base64 = (await response.text()).trim();
        return unpackTar(gunzipSync(Buffer.from(base64, "base64")));
      })
      .catch((error) => {
        filesPromise = undefined;
        throw error;
      });
  }
  return filesPromise;
}

function unpackTar(buffer) {
  const files = new Map();
  let offset = 0;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    const path = `${prefix ? `${prefix}/` : ""}${name}`.replace(/^\.\//, "");
    const sizeText = readString(header, 124, 12).trim();
    const size = sizeText ? Number.parseInt(sizeText, 8) : 0;
    const type = String.fromCharCode(header[156] || 48);
    offset += 512;
    if ((type === "0" || type === "\0") && path) {
      files.set(path, Buffer.from(buffer.subarray(offset, offset + size)));
    }
    offset += Math.ceil(size / 512) * 512;
  }
  if (!files.get("dist/index.html")?.toString("utf8").includes(RELEASE_MARKER)) {
    throw new Error("Bundle release marker mismatch");
  }
  return files;
}

function readString(buffer, start, length) {
  const raw = buffer.subarray(start, start + length);
  const zero = raw.indexOf(0);
  return raw.subarray(0, zero === -1 ? raw.length : zero).toString("utf8");
}

function contentType(path) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".mjs") || path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (path.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function sendText(res, status, text) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(text);
}
