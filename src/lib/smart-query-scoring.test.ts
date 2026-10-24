import assert from "node:assert/strict";
import test from "node:test";
import { createSemanticSimilarity, directSemanticTextScore } from "./smart-query-scoring";

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


test("empty direct query does not prepare unused fields", () => {
  const fields = [{ get value(): string { throw new Error("Unused field read"); } }];
  assert.equal(directSemanticTextScore("", fields), 0.5);
});


test("field score ceilings preserve later stronger matches and independent query terms", () => {
  assert.equal(directSemanticTextScore("animal", [{ value: "animal", weight: 0.5 }, { value: "animal", weight: 1 }]), 1);
  assert.equal(directSemanticTextScore("animal housing", [{ value: "animal", weight: 1 }, { value: "housing", weight: 0.5 }]), 0.75);
  assert.equal(directSemanticTextScore("animel", [{ value: "animal", weight: 0.5 }, { value: "animel", weight: 1 }]), 1);
  assert.equal(directSemanticTextScore("animal", [{ value: "animal", weight: 0 }, { value: "animal", weight: 0.5 }]), 0.5);
});


test("edit-distance row reuse preserves fuzzy thresholds across different lengths", () => {
  for (let repeat = 0; repeat < 3; repeat += 1) {
    assert.equal(directSemanticTextScore("abcd", [{ value: "abce" }]), 0.72);
    assert.equal(directSemanticTextScore("abcdefgh", [{ value: "abcxefgy" }]), 0.72);
    assert.equal(directSemanticTextScore("abcdefgh", [{ value: "abcxezgy" }]), 0);
    assert.equal(directSemanticTextScore("abcdefgh", [{ value: "abcdefg" }]), 0.86);
  }
});


test("request-local similarity preserves scores after cache fills and fields change", () => {
  const similarity = createSemanticSimilarity();
  for (let i = 0; i < 4200; i += 1) {
    const query = `synthetic${i}`;
    const fields = [{ value: `synthetiq${i + 1}`, weight: (i % 10) / 10 }];
    assert.equal(directSemanticTextScore(query, fields, similarity), directSemanticTextScore(query, fields));
  }
  for (const weight of [0, 0.5, 1]) {
    const fields = [{ value: "animal", weight }];
    assert.equal(directSemanticTextScore("animel", fields, similarity), directSemanticTextScore("animel", fields));
    assert.equal(directSemanticTextScore("animel", fields, createSemanticSimilarity()), directSemanticTextScore("animel", fields));
  }
});
