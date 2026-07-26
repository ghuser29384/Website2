import assert from "node:assert/strict";
import test from "node:test";

import {
  cosineSimilarity,
  deterministicPublicEmbedding,
  retrievePublicSemanticEmbeddings,
} from "./public-semantic-embeddings";

test("the deterministic fallback is stable and stays in one normalized vector space", () => {
  const first = deterministicPublicEmbedding("Animal welfare and alternatives to factory farming");
  const repeated = deterministicPublicEmbedding("Animal welfare and alternatives to factory farming");
  const different = deterministicPublicEmbedding("Independent evaluation of advanced AI systems");

  assert.deepEqual(first, repeated);
  assert.equal(first.length, 384);
  assert.ok(Math.abs(cosineSimilarity(first, first) - 1) < 1e-9);
  assert.ok(cosineSimilarity(first, different) < 0.95);
});

test("public embedding retrieval fails closed to local vectors without a provider key", async () => {
  const priorKey = process.env.OPENAI_API_KEY;
  const priorFlag = process.env.LIVE_FEED_EMBEDDINGS_ENABLED;
  delete process.env.OPENAI_API_KEY;
  process.env.LIVE_FEED_EMBEDDINGS_ENABLED = "true";

  try {
    const batch = await retrievePublicSemanticEmbeddings([
      {
        key: "concept:animal-welfare",
        kind: "canonical",
        sourceId: "animal-welfare",
        publicText: "Animal welfare and reducing large-scale non-human suffering.",
      },
      {
        key: "opportunity:offer:public-one",
        kind: "opportunity",
        sourceId: "public-one",
        publicText: "A public offer to produce independently reviewed animal-welfare research.",
      },
    ]);

    assert.equal(batch.mode, "deterministic_fallback");
    assert.equal(batch.privateTextSentToProvider, false);
    assert.equal(batch.providerInputCount, 0);
    assert.equal(batch.vectors.size, 2);
    assert.equal(batch.dimensions, 384);
  } finally {
    if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorKey;
    if (priorFlag === undefined) delete process.env.LIVE_FEED_EMBEDDINGS_ENABLED;
    else process.env.LIVE_FEED_EMBEDDINGS_ENABLED = priorFlag;
  }
});
