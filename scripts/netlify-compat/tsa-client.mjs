import { Buffer } from 'node:buffer';

const sha256Identifier = Buffer.from('300d06096086480165030402010500', 'hex');
const der = (tag, value) => {
  if (value.length >= 128) throw new Error('Unexpected timestamp request length');
  return Buffer.concat([Buffer.from([tag, value.length]), value]);
};

// rootHash is already SHA-256. Hashing it again would timestamp different data.
export function createTimestampQuery(rootHash, nonceBytes = crypto.getRandomValues(new Uint8Array(8))) {
  if (typeof rootHash !== 'string' || !/^[\da-f]{64}$/i.test(rootHash)) {
    throw new Error('Timestamp requires a 32-byte SHA-256 hex digest.');
  }
  if (!(nonceBytes instanceof Uint8Array) || nonceBytes.length !== 8) throw new Error('Invalid timestamp nonce.');
  let nonce = Buffer.from(nonceBytes);
  while (nonce.length > 1 && nonce[0] === 0) nonce = nonce.subarray(1);
  if (nonce[0] & 128) nonce = Buffer.concat([Buffer.from([0]), nonce]);
  return der(0x30, Buffer.concat([
    Buffer.from([2, 1, 1]),
    der(0x30, Buffer.concat([sha256Identifier, der(4, Buffer.from(rootHash, 'hex'))])),
    der(2, nonce),
    Buffer.from([1, 1, 255]),
  ]));
}

export async function requestTimestamp(rootHash, {
  env = process.env, fetchImpl = globalThis.fetch,
  readCaFile, verifyResponse, createQuery = createTimestampQuery,
} = {}) {
  if (!env.TSA_URL) throw new Error('TSA_URL is not configured.');
  const query = createQuery(rootHash);
  if (!fetchImpl) throw new Error('Global fetch is not available for TSA requests.');
  // Preserve FILE precedence, PEM escaped-newline support and unverified mode.
  // Read a configured trust source before contacting the TSA; never fall back
  // silently when that source is missing. Proof parsing validates its contents.
  const verify = Boolean(env.TSA_CA_FILE || env.TSA_CA_PEM);
  const pem = env.TSA_CA_FILE
    ? await readCaFile(env.TSA_CA_FILE)
    : env.TSA_CA_PEM?.replace(/\\n/g, '\n');
  if (verify && (!pem?.trim() || typeof verifyResponse !== 'function')) {
    throw new Error('Timestamp trust configuration is unavailable.');
  }
  const response = await fetchImpl(env.TSA_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/timestamp-query' }, body: query,
  });
  if (!response.ok) throw new Error(`TSA request failed with HTTP ${response.status}`);
  const token = Buffer.from(await response.arrayBuffer());
  if (verify) await verifyResponse({ token, query, pem });
  return token;
}
