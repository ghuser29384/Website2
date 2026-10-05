import assert from "node:assert/strict";
import test from "node:test";
import { readPublicData } from "./public-read-deadline";

test("public reads preserve successful empty and nonempty responses", async () => {
  const result = { records: [], hasNext: false };
  assert.equal(await readPublicData(Promise.resolve(result)), result);
  assert.equal(await readPublicData(Promise.resolve(12)), 12);
});

test("public reads preserve upstream failures", async () => {
  const failure = new Error("upstream unavailable");
  await assert.rejects(readPublicData(Promise.reject(failure)), (error) => error === failure);
});

test("a stalled public read becomes unavailable at its deadline", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const result = readPublicData(new Promise<never>(() => {}));
  const rejected = assert.rejects(result, /could not be loaded in time/);
  context.mock.timers.tick(4_000);
  await rejected;
});

test("late completion cannot replace an unavailable result", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let resolveRead!: (value: number) => void;
  const result = readPublicData(new Promise<number>((resolve) => { resolveRead = resolve; }));
  const rejected = assert.rejects(result, /could not be loaded in time/);
  context.mock.timers.tick(4_000);
  await rejected;
  resolveRead(99);
  await assert.rejects(result, /could not be loaded in time/);
});
