import assert from "node:assert/strict";
import test from "node:test";
import { directSemanticTextScore } from "./smart-query-scoring";

test("semantic scoring retains exact and substring matches across length differences", () => {
  assert.equal(directSemanticTextScore("volunteer", [{ value: "volunteer" }]), 1);
  assert.equal(directSemanticTextScore("volunteer", [{ value: "volunteering" }]), 1);
  assert.equal(directSemanticTextScore("volunteering", [{ value: "volunteer" }]), 0.86);
});

test("semantic scoring retains accepted insertion, deletion and substitution typos", () => {
  for (const [query, value] of [
    ["animel", "animal"], ["animl", "animal"], ["animaal", "animal"],
    ["governmnt", "government"], ["governmt", "government"],
  ]) assert.equal(directSemanticTextScore(query, [{ value }]), 0.72, `${query}: ${value}`);
});

test("semantic scoring rejects unrelated lengths while retaining short-word rules", () => {
  for (const [query, value] of [["abcd", "xyabcdzzq"], ["cat", "bat"], ["animal", "education"]]) {
    // The first pair remains a substring match even outside the typo threshold.
    assert.equal(directSemanticTextScore(query, [{ value }]), query === "abcd" ? 1 : 0);
  }
});

test("semantic scoring preserves empty input and weighted field behavior", () => {
  assert.equal(directSemanticTextScore("", [{ value: "animal" }]), 0.5);
  assert.equal(directSemanticTextScore("animal", [{ value: "" }]), 0);
  assert.equal(directSemanticTextScore("animel", [{ value: "animal", weight: 0.5 }]), 0.36);
  assert.equal(directSemanticTextScore("animal", [{ value: "animal", weight: -1 }]), 0);
});


test("prepared fields do not retain values or weights between calls", () => {
  const fields = [{ value: "animal", weight: 1 }];
  assert.equal(directSemanticTextScore("animal", fields), 1);
  fields[0].value = "housing";
  assert.equal(directSemanticTextScore("animal", fields), 0);
  fields[0].value = "animal";
  fields[0].weight = 0;
  assert.equal(directSemanticTextScore("animal", fields), 0);
});
