import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";

const publicDirectory = new URL("../public/", import.meta.url);
const chunkNames = [
  "mt-live-0d0e0f03-0a.txt",
  "mt-live-0d0e0f03-0b.txt",
  "mt-live-0d0e0f03-0c.txt",
  "mt-live-0d0e0f03-0d.txt",
  "mt-live-0d0e0f03-1.txt",
  "mt-live-0d0e0f03-2.txt",
  "mt-live-0d0e0f03-3.txt",
  "mt-live-0d0e0f03-4a.txt",
  "mt-live-0d0e0f03-4b.txt",
  "mt-live-0d0e0f03-4c.txt",
  "mt-live-0d0e0f03-4d.txt",
  "mt-live-0d0e0f03-5a.txt",
  "mt-live-0d0e0f03-5b.txt",
  "mt-live-0d0e0f03-5c.txt",
  "mt-live-0d0e0f03-5d.txt",
];

const replacements = [
  [
    "Decide, allocate, and automate from one coherent workspace.",
    "Find opportunities, plan what you can offer, and track your trades in one place.",
  ],
  ["Offer summary + counterparty attestation.", "Offer summary + signed statement from the other participant."],
  ["When a trusted counterparty submits an offer", "When a trusted participant submits an offer"],
  ["Near activation", "Near goal"],
  ["['portfolio','Portfolio'],['ledger','Ledger']", "['portfolio','Overview'],['ledger','Payments']"],
  ["Across 2 mechanisms", "Across 2 trade types"],
  ["<div class=\"eyebrow\">Lifecycle</div>", "<div class=\"eyebrow\">Status</div>"],
  ["Conditional $380", "Waiting $380"],
  ["Activated $120", "Active $120"],
  ["Activated this month", "Started this month"],
  ["Ledger period", "Statement period"],
  ["Verified outcomes", "Completed trades"],
  ["Pending verification", "Evidence due"],
  ["Complete verification", "Submit evidence"],
  ["The other side activated", "What the other person does"],
  ["Money state", "Payment status"],
  ["Counterparty & proof", "Other participant & evidence"],
  ["Dispute resolution ·", "Disputes reviewed by"],
  ["<small>Counterparty</small>", "<small>Other participant</small>"],
  ["moral-trade-ledger.csv", "moral-trade-payments.csv"],
  ["Ledger CSV exported.", "Payment CSV exported."],
];

const chunks = await Promise.all(
  chunkNames.map((name) => readFile(new URL(name, publicDirectory), "utf8")),
);
let source = gunzipSync(Buffer.from(chunks.join(""), "base64")).toString("utf8");

for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.replaceAll(from, to);
  } else if (!source.includes(to)) {
    throw new Error(`Feed copy source did not contain expected text: ${from}`);
  }
}

const nextEncoded = gzipSync(Buffer.from(source, "utf8"), { level: 9 }).toString("base64");
const fixedPrefixLength = chunks.slice(0, -1).reduce((sum, chunk) => sum + chunk.length, 0);
if (nextEncoded.length <= fixedPrefixLength) {
  throw new Error("Updated feed payload is unexpectedly too small for the existing chunk layout");
}

let offset = 0;
const nextChunks = chunks.map((chunk, index) => {
  const length = index === chunks.length - 1 ? nextEncoded.length - offset : chunk.length;
  const value = nextEncoded.slice(offset, offset + length);
  offset += length;
  return value;
});

await Promise.all(
  chunkNames.map((name, index) => writeFile(new URL(name, publicDirectory), nextChunks[index], "utf8")),
);

const shellUrl = new URL("moral-trade-live.html", publicDirectory);
const shell = await readFile(shellUrl, "utf8");
const digest = createHash("sha256").update(Buffer.from(source, "utf8")).digest("hex");
const currentDigest = shell.match(/digest !== '([a-f0-9]{64})'/)?.[1];
if (!currentDigest) throw new Error("Feed shell integrity hash was not found");
await writeFile(shellUrl, shell.replace(currentDigest, digest), "utf8");

console.log(`Updated ${replacements.length} feed phrases and integrity hash ${digest}.`);
