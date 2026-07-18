import assert from "node:assert/strict";
import test from "node:test";

import { getTradeFlowStage } from "./trade-flow-stage";

test("proposed agreements stop at bilateral confirmation", () => {
  assert.deepEqual(getTradeFlowStage("proposed", false), {
    completedThrough: 0,
    currentIndex: 1,
    ended: false,
    progressOffset: 76,
  });
});

test("active agreements move to the commitment stage", () => {
  assert.deepEqual(getTradeFlowStage("active", true), {
    completedThrough: 1,
    currentIndex: 2,
    ended: false,
    progressOffset: 53,
  });
});

test("evidence states stop at evidence review", () => {
  assert.equal(getTradeFlowStage("evidence_due", true).currentIndex, 3);
  assert.equal(getTradeFlowStage("disputed", true).currentIndex, 3);
});

test("completed agreements fill the whole route", () => {
  assert.deepEqual(getTradeFlowStage("completed", true), {
    completedThrough: 4,
    currentIndex: null,
    ended: false,
    progressOffset: 0,
  });
});

test("ended agreements never imply completion", () => {
  const preActivation = getTradeFlowStage("cancelled", false);
  const postActivation = getTradeFlowStage("cancelled", true);

  assert.equal(preActivation.ended, true);
  assert.equal(preActivation.completedThrough, 0);
  assert.equal(postActivation.ended, true);
  assert.equal(postActivation.completedThrough, 1);
});
