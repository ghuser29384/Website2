import { createHash } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";

export type PublicEmbeddingInputKind = "canonical" | "opportunity";

export interface PublicEmbeddingInput {
  key: string;
  kind: PublicEmbeddingInputKind;
  publicText: string;
  sourceId?: string;
}

export type PublicEmbeddingMode =
  | "openai"
  | "openai_cache"
  | "deterministic_fallback";

export interface PublicEmbeddingBatch {
  vectors: ReadonlyMap<string, number[]>;
  mode: PublicEmbeddingMode;
  model: string;
  dimensions: number;
  cacheHitCount: number;
  providerInputCount: number;
  /** Always false by construction: this module accepts public/canonical text only. */
  privateTextSentToProvider: false;
}

export interface PublicEmbeddingProvider {
  embed(inputs: readonly PublicEmbeddingInput[]): Promise<PublicEmbeddingBatch>;
}

interface CachedEmbeddingRow {
  content_hash: string;
  model: string;
  dimensions: number;
  embedding: unknown;
}

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_FALLBACK_DIMENSIONS = 384;
const DEFAULT_BATCH_SIZE = 96;
const MEMORY_CACHE_LIMIT = 4_096;
const memoryCache = new Map<string, number[]>();
let cacheReadFailureLogged = false;
let cacheWriteFailureLogged = false;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function cleanPublicText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 2_400);
}

function configuredDimensions() {
  const value = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS);
  return Number.isInteger(value) && value >= 64 && value <= 3_072 ? value : null;
}

function configuredTimeoutMs() {
  const value = Number(process.env.OPENAI_EMBEDDING_TIMEOUT_MS);
  return Number.isFinite(value) ? Math.round(clamp(value, 1_000, 20_000)) : 6_500;
}

function contentHash(publicText: string) {
  return createHash("sha256").update(publicText, "utf8").digest("hex");
}

function cacheKey(model: string, hash: string) {
  return `${model}:${hash}`;
}

function normalizedVector(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length < 8 || value.length > 4_096) return null;
  const vector = value.map(Number);
  if (vector.some((item) => !Number.isFinite(item))) return null;
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  if (!Number.isFinite(norm) || norm <= 0) return null;
  return vector.map((item) => item / norm);
}

function remember(key: string, vector: number[]) {
  if (memoryCache.has(key)) memoryCache.delete(key);
  memoryCache.set(key, vector);
  while (memoryCache.size > MEMORY_CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value as string | undefined;
    if (!oldest) break;
    memoryCache.delete(oldest);
  }
}

function hash32(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/**
 * Availability fallback, not a substitute for provider embeddings. It keeps the
 * whole request in one deterministic vector space when the provider or cache is
 * unavailable, so cosine comparisons remain valid.
 */
export function deterministicPublicEmbedding(
  text: string,
  dimensions = DEFAULT_FALLBACK_DIMENSIONS,
) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const normalized = cleanPublicText(text).toLowerCase();
  const words = normalized.match(/[a-z0-9]+/g) ?? [];
  const features = new Set<string>();

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    features.add(`w:${word}`);
    if (index + 1 < words.length) features.add(`b:${word}_${words[index + 1]}`);
    if (word.length >= 5) {
      for (let offset = 0; offset <= word.length - 3; offset += 1) {
        features.add(`c:${word.slice(offset, offset + 3)}`);
      }
    }
  }

  for (const feature of features) {
    const hash = hash32(feature);
    const index = hash % dimensions;
    const sign = hash32(`sign:${feature}`) & 1 ? 1 : -1;
    vector[index] += sign * (feature.startsWith("b:") ? 1.25 : 1);
  }

  return normalizedVector(vector) ?? vector;
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = Number(left[index]);
    const rightValue = Number(right[index]);
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }
  if (leftNorm <= 0 || rightNorm <= 0) return 0;
  return clamp(dot / Math.sqrt(leftNorm * rightNorm), -1, 1);
}

async function readPersistentCache(model: string, hashes: readonly string[]) {
  const rows = new Map<string, number[]>();
  if (!hashes.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return rows;

  try {
    const service = createServiceClient() as any;
    for (let offset = 0; offset < hashes.length; offset += 250) {
      const batch = hashes.slice(offset, offset + 250);
      const result = await service
        .from("public_semantic_embeddings")
        .select("content_hash,model,dimensions,embedding")
        .eq("model", model)
        .in("content_hash", batch);
      if (result.error) throw result.error;
      for (const row of (result.data ?? []) as CachedEmbeddingRow[]) {
        const vector = normalizedVector(row.embedding);
        if (vector && vector.length === Number(row.dimensions)) {
          rows.set(row.content_hash, vector);
        }
      }
    }
  } catch (error) {
    if (!cacheReadFailureLogged) {
      cacheReadFailureLogged = true;
      console.error("[live-now] Public embedding cache read failed; using provider or fallback", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return rows;
}

async function writePersistentCache(
  model: string,
  inputs: readonly PublicEmbeddingInput[],
  hashes: ReadonlyMap<string, string>,
  vectors: ReadonlyMap<string, number[]>,
) {
  if (!inputs.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const rowsByHash = new Map<string, Record<string, unknown>>();
  for (const input of inputs) {
    const hash = hashes.get(input.key);
    const vector = vectors.get(input.key);
    if (!hash || !vector || rowsByHash.has(hash)) continue;
    rowsByHash.set(hash, {
      content_hash: hash,
      model,
      dimensions: vector.length,
      embedding: vector,
      public_text: input.publicText,
      source_kind: input.kind,
      source_id: input.sourceId ?? null,
      updated_at: new Date().toISOString(),
    });
  }
  const rows = [...rowsByHash.values()];
  if (!rows.length) return;

  try {
    const service = createServiceClient() as any;
    for (let offset = 0; offset < rows.length; offset += 100) {
      const result = await service
        .from("public_semantic_embeddings")
        .upsert(rows.slice(offset, offset + 100), { onConflict: "content_hash,model" });
      if (result.error) throw result.error;
    }
  } catch (error) {
    if (!cacheWriteFailureLogged) {
      cacheWriteFailureLogged = true;
      console.error("[live-now] Public embedding cache write failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function requestOpenAiEmbeddingBatch(
  model: string,
  dimensions: number | null,
  inputs: readonly PublicEmbeddingInput[],
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), configuredTimeoutMs());
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: inputs.map((input) => input.publicText),
        encoding_format: "float",
        ...(dimensions ? { dimensions } : {}),
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`OpenAI embeddings ${response.status}: ${detail}`);
    }
    const payload = await response.json() as {
      data?: Array<{ index?: number; embedding?: unknown }>;
    };
    const ordered = [...(payload.data ?? [])].sort(
      (left, right) => Number(left.index ?? 0) - Number(right.index ?? 0),
    );
    if (ordered.length !== inputs.length) {
      throw new Error("OpenAI embeddings response count did not match the public input count");
    }
    return ordered.map((item) => {
      const vector = normalizedVector(item.embedding);
      if (!vector) throw new Error("OpenAI returned an invalid embedding vector");
      return vector;
    });
  } finally {
    clearTimeout(timer);
  }
}

async function requestOpenAiEmbeddings(
  model: string,
  dimensions: number | null,
  inputs: readonly PublicEmbeddingInput[],
) {
  const chunks: PublicEmbeddingInput[][] = [];
  for (let offset = 0; offset < inputs.length; offset += DEFAULT_BATCH_SIZE) {
    chunks.push(inputs.slice(offset, offset + DEFAULT_BATCH_SIZE));
  }

  const vectors = new Map<string, number[]>();
  const concurrency = 4;
  for (let offset = 0; offset < chunks.length; offset += concurrency) {
    const wave = chunks.slice(offset, offset + concurrency);
    const results = await Promise.all(
      wave.map((batch) => requestOpenAiEmbeddingBatch(model, dimensions, batch)),
    );
    wave.forEach((batch, batchIndex) => {
      batch.forEach((input, inputIndex) => {
        vectors.set(input.key, results[batchIndex][inputIndex]);
      });
    });
  }
  return vectors;
}

function fallbackBatch(inputs: readonly PublicEmbeddingInput[], model: string): PublicEmbeddingBatch {
  const vectors = new Map<string, number[]>();
  inputs.forEach((input) => {
    vectors.set(input.key, deterministicPublicEmbedding(input.publicText));
  });
  return {
    vectors,
    mode: "deterministic_fallback",
    model: `${model}:deterministic-fallback-v1`,
    dimensions: vectors.values().next().value?.length ?? DEFAULT_FALLBACK_DIMENSIONS,
    cacheHitCount: 0,
    providerInputCount: 0,
    privateTextSentToProvider: false,
  };
}

export async function retrievePublicSemanticEmbeddings(
  rawInputs: readonly PublicEmbeddingInput[],
): Promise<PublicEmbeddingBatch> {
  const deduped = new Map<string, PublicEmbeddingInput>();
  for (const input of rawInputs) {
    const key = input.key.trim().slice(0, 220);
    const publicText = cleanPublicText(input.publicText);
    if (!key || !publicText || deduped.has(key)) continue;
    deduped.set(key, { ...input, key, publicText });
  }
  const inputs = [...deduped.values()];
  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODEL;
  const dimensions = configuredDimensions();
  const cacheModel = dimensions ? `${model}:dimensions=${dimensions}` : model;
  const reportedModel = dimensions ? `${model} (${dimensions}d)` : model;
  if (!inputs.length) return fallbackBatch([], reportedModel);
  if (!process.env.OPENAI_API_KEY || process.env.LIVE_FEED_EMBEDDINGS_ENABLED === "false") {
    return fallbackBatch(inputs, reportedModel);
  }

  const hashes = new Map(inputs.map((input) => [input.key, contentHash(input.publicText)]));
  const vectors = new Map<string, number[]>();
  let cacheHitCount = 0;

  for (const input of inputs) {
    const hash = hashes.get(input.key)!;
    const vector = memoryCache.get(cacheKey(cacheModel, hash));
    if (!vector) continue;
    vectors.set(input.key, vector);
    cacheHitCount += 1;
  }

  const unresolvedHashes = [...new Set(
    inputs
      .filter((input) => !vectors.has(input.key))
      .map((input) => hashes.get(input.key)!),
  )];
  const persistent = await readPersistentCache(cacheModel, unresolvedHashes);
  for (const input of inputs) {
    if (vectors.has(input.key)) continue;
    const hash = hashes.get(input.key)!;
    const vector = persistent.get(hash);
    if (!vector) continue;
    vectors.set(input.key, vector);
    remember(cacheKey(cacheModel, hash), vector);
    cacheHitCount += 1;
  }

  const missing = inputs.filter((input) => !vectors.has(input.key));
  if (!missing.length) {
    const vectorDimensions = vectors.values().next().value?.length ?? configuredDimensions() ?? 0;
    return {
      vectors,
      mode: "openai_cache",
      model: reportedModel,
      dimensions: vectorDimensions,
      cacheHitCount,
      providerInputCount: 0,
      privateTextSentToProvider: false,
    };
  }

  try {
    const uniqueMissingByHash = new Map<string, PublicEmbeddingInput>();
    for (const input of missing) {
      const hash = hashes.get(input.key)!;
      if (!uniqueMissingByHash.has(hash)) uniqueMissingByHash.set(hash, input);
    }
    const uniqueMissing = [...uniqueMissingByHash.values()];
    const providerVectors = await requestOpenAiEmbeddings(model, dimensions, uniqueMissing);
    const providerVectorsForAll = new Map<string, number[]>();
    for (const input of missing) {
      const hash = hashes.get(input.key)!;
      const representative = uniqueMissingByHash.get(hash)!;
      const vector = providerVectors.get(representative.key);
      if (!vector) throw new Error(`Missing provider vector for ${input.key}`);
      vectors.set(input.key, vector);
      providerVectorsForAll.set(input.key, vector);
      remember(cacheKey(cacheModel, hash), vector);
    }
    await writePersistentCache(cacheModel, missing, hashes, providerVectorsForAll);
    const vectorDimensions = vectors.values().next().value?.length ?? configuredDimensions() ?? 0;
    if ([...vectors.values()].some((vector) => vector.length !== vectorDimensions)) {
      throw new Error("Embedding cache and provider dimensions did not match");
    }
    return {
      vectors,
      mode: "openai",
      model: reportedModel,
      dimensions: vectorDimensions,
      cacheHitCount,
      providerInputCount: uniqueMissing.length,
      privateTextSentToProvider: false,
    };
  } catch (error) {
    console.error("[live-now] Public semantic retrieval fell back to local vectors", {
      message: error instanceof Error ? error.message : String(error),
      publicInputCount: inputs.length,
    });
    return fallbackBatch(inputs, reportedModel);
  }
}

export const defaultPublicEmbeddingProvider: PublicEmbeddingProvider = {
  embed: retrievePublicSemanticEmbeddings,
};
