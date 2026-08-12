import crypto from "node:crypto";

const ARMS = Object.freeze([
  "neither_role",
  "role_a_only",
  "role_b_only",
  "both_roles",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const text = typeof value === "string" ? value : canonicalJson(value);
  return `sha256:${crypto.createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function seedToUint32(seed) {
  const digest = crypto.createHash("sha256").update(seed, "utf8").digest();
  return digest.readUInt32LE(0) || 0x9e3779b9;
}

export function createPrng(seed) {
  let state = seedToUint32(seed) >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

/**
 * Deterministic, blocked 2x2 encouragement assignment for frozen synthetic
 * graph clusters. Each complete block contains one cluster in each arm.
 * Incomplete blocks are a no-launch error rather than an invitation to
 * silently change assignment probabilities.
 */
export function assignTradeClusters({ clusters, seed, expectedSnapshotHash }) {
  assert(Array.isArray(clusters) && clusters.length > 0, "clusters must be non-empty.");
  assert(typeof seed === "string" && seed.length >= 16, "seed must be a frozen non-empty string.");
  assert(/^sha256:[0-9a-f]{64}$/.test(expectedSnapshotHash), "expectedSnapshotHash is invalid.");

  const normalized = clusters.map((cluster) => {
    assert(cluster && typeof cluster === "object" && !Array.isArray(cluster), "cluster must be an object.");
    assert(/^synthetic:[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(cluster.clusterKey), "clusterKey must be synthetic.");
    assert(typeof cluster.stratumKey === "string" && cluster.stratumKey.length > 0, "stratumKey is required.");
    assert(Number.isInteger(cluster.eligibleDyadCount) && cluster.eligibleDyadCount > 0, "eligibleDyadCount must be positive.");
    return {
      clusterKey: cluster.clusterKey,
      stratumKey: cluster.stratumKey,
      eligibleDyadCount: cluster.eligibleDyadCount,
    };
  });

  assert(new Set(normalized.map((entry) => entry.clusterKey)).size === normalized.length, "clusterKey values must be unique.");

  const snapshotHash = sha256(normalized.sort((a, b) => a.clusterKey.localeCompare(b.clusterKey)));
  assert(snapshotHash === expectedSnapshotHash, "Frozen eligible-population snapshot hash mismatch.");

  const random = createPrng(seed);
  const byStratum = new Map();
  for (const cluster of normalized) {
    const entries = byStratum.get(cluster.stratumKey) ?? [];
    entries.push(cluster);
    byStratum.set(cluster.stratumKey, entries);
  }

  const assignments = [];
  for (const [stratumKey, entries] of [...byStratum.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    assert(entries.length % ARMS.length === 0, `Stratum ${stratumKey} is not divisible by four; no launch.`);
    const shuffled = shuffle(entries.sort((a, b) => a.clusterKey.localeCompare(b.clusterKey)), random);
    for (let blockStart = 0; blockStart < shuffled.length; blockStart += ARMS.length) {
      const armOrder = shuffle(ARMS, random);
      for (let offset = 0; offset < ARMS.length; offset += 1) {
        const cluster = shuffled[blockStart + offset];
        assignments.push({
          clusterKey: cluster.clusterKey,
          stratumKey,
          eligibleDyadCount: cluster.eligibleDyadCount,
          armKey: armOrder[offset],
          assignmentProbability: "0.25",
          blockIndex: blockStart / ARMS.length,
        });
      }
    }
  }

  assignments.sort((a, b) => a.clusterKey.localeCompare(b.clusterKey));
  const manifest = {
    assignmentDesign: "stratified_blocked_graph_cluster_2x2_encouragement_v1",
    eligiblePopulationSnapshotHash: expectedSnapshotHash,
    seedCommitment: sha256(seed),
    arms: ARMS,
    assignments,
  };

  return {
    ...manifest,
    assignmentManifestHash: sha256(manifest),
  };
}

export { ARMS };
