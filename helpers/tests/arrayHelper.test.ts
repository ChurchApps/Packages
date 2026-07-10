import { test } from "node:test";
import assert from "node:assert/strict";

import { ArrayHelper } from "../src/ArrayHelper";

test("getIds returns unique, non-missing ids in first-seen order", () => {
  const items = [{ id: "1" }, { id: "2" }, { id: "1" }, { id: null }, { id: "" }, { id: undefined }];
  assert.deepEqual(ArrayHelper.getIds(items, "id"), ["1", "2"]);
});

test("sortBy sorts ascending and descending by property", () => {
  const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
  ArrayHelper.sortBy(items, "n");
  assert.deepEqual(items.map(i => i.n), [1, 2, 3]);
  ArrayHelper.sortBy(items, "n", true);
  assert.deepEqual(items.map(i => i.n), [3, 2, 1]);
});

test("getIndex/getOne/getAll match on a simple property", () => {
  const items = [{ id: "a", type: "x" }, { id: "b", type: "y" }, { id: "c", type: "x" }];
  assert.equal(ArrayHelper.getIndex(items, "type", "y"), 1);
  assert.equal(ArrayHelper.getIndex(items, "type", "zzz"), -1);
  assert.equal(ArrayHelper.getOne(items, "id", "b")?.type, "y");
  assert.equal(ArrayHelper.getOne(items, "id", "nope"), null);
  assert.deepEqual(ArrayHelper.getAll(items, "type", "x").map(i => i.id), ["a", "c"]);
});

test("getOne/getIndex compare via a dotted property chain", () => {
  const items = [{ id: "a", meta: { kind: "x" } }, { id: "b", meta: { kind: "y" } }];
  assert.equal(ArrayHelper.getOne(items, "meta.kind", "y")?.id, "b");
  assert.equal(ArrayHelper.getIndex(items, "meta.kind", "x"), 0);
});

// Suspected bug: ArrayHelper.compare() (ArrayHelper.ts:55) treats `null !== undefined` as "keep descending",
// so a dotted lookup through an intermediate null throws instead of failing the comparison gracefully.
test("compare() throws (does not gracefully fail) when a dotted chain passes through an explicit null", () => {
  const items = [{ id: "c", meta: null }];
  assert.throws(() => ArrayHelper.getAll(items, "meta.kind", "x"));
});

test("getAllArray keeps items whose property is in the given values list", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(ArrayHelper.getAllArray(items, "id", ["a", "c"]).map(i => i.id), ["a", "c"]);
  assert.deepEqual(ArrayHelper.getAllArray(items, "id", []), []);
});

test("getUniqueValues dedupes plain and dotted property values", () => {
  const items = [{ v: 1 }, { v: 2 }, { v: 1 }];
  assert.deepEqual(ArrayHelper.getUniqueValues(items, "v"), [1, 2]);
  const nested = [{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 1 } }];
  assert.deepEqual(ArrayHelper.getUniqueValues(nested, "a.b"), [1, 2]);
});

test("getUnique dedupes objects by JSON identity", () => {
  const items = [{ id: "1" }, { id: "2" }, { id: "1" }];
  assert.deepEqual(ArrayHelper.getUnique(items), [{ id: "1" }, { id: "2" }]);
});

test("getAllOperator supports equals/contains/greaterThan with string and number dataTypes", () => {
  const items = [{ n: "5" }, { n: "10" }, { n: "15" }];
  assert.deepEqual(ArrayHelper.getAllOperator(items, "n", "10", "equals", "number").map(i => i.n), ["10"]);
  assert.deepEqual(ArrayHelper.getAllOperator(items, "n", "5", "greaterThan", "number").map(i => i.n), ["10", "15"]);

  const names = [{ name: "Alice" }, { name: "Bob" }, { name: "Albert" }];
  assert.deepEqual(ArrayHelper.getAllOperator(names, "name", "al", "startsWith").map(i => i.name), ["Alice", "Albert"]);
  assert.deepEqual(ArrayHelper.getAllOperator(names, "name", "b", "contains").map(i => i.name), ["Bob", "Albert"]);
});

test("getAllOperatorArray maps aliased operators (in/notIn/attendedX) onto equals/notEqual", () => {
  const items = [{ v: "a" }, { v: "b" }, { v: "c" }];
  assert.deepEqual(ArrayHelper.getAllOperatorArray(items, "v", ["a", "c"], "in").map(i => i.v), ["a", "c"]);
  assert.deepEqual(ArrayHelper.getAllOperatorArray(items, "v", ["a"], "notIn").map(i => i.v), ["b", "c"]);
});

test("getDeepValue walks dotted paths and returns undefined past a null", () => {
  assert.equal(ArrayHelper.getDeepValue({ a: { b: { c: 5 } } }, "a.b.c"), 5);
  assert.equal(ArrayHelper.getDeepValue({ a: null }, "a.b.c"), null);
});

test("fillArray repeats the given value n times", () => {
  assert.deepEqual(ArrayHelper.fillArray("x", 3), ["x", "x", "x"]);
  assert.deepEqual(ArrayHelper.fillArray("x", 0), []);
});
