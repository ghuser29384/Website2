import test from 'node:test';
import assert from 'node:assert/strict';

test('loading the hosted fixture preserves the platform fetch function', async () => {
  const platformFetch = globalThis.fetch;
  await import('./netlify/functions/public.mjs');
  assert.equal(globalThis.fetch, platformFetch);
});

test('fixture refuses nonfixture destinations without using platform transport', async () => {
  const { fixtureFetch } = await import('./netlify/lib/fixture.mjs');
  await assert.rejects(fixtureFetch('https://example.invalid/'), /External fetch blocked/);
  await assert.rejects(fixtureFetch(new Request('https://example.invalid/')), /External fetch blocked/);
});
