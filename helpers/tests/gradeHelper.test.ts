import { test } from "node:test";
import assert from "node:assert/strict";

import { GradeHelper, GRADES } from "../src/GradeHelper";

test("getIndex returns the position in the canonical grade order, or -1 when unknown/missing", () => {
  assert.equal(GradeHelper.getIndex("PreK"), 0);
  assert.equal(GradeHelper.getIndex("K"), 1);
  assert.equal(GradeHelper.getIndex("Graduated"), GRADES.length - 1);
  assert.equal(GradeHelper.getIndex("not-a-grade"), -1);
  assert.equal(GradeHelper.getIndex(null), -1);
  assert.equal(GradeHelper.getIndex(undefined), -1);
});

test("nextGrade advances to the following grade and returns null at the end or for unknown input", () => {
  assert.equal(GradeHelper.nextGrade("PreK"), "K");
  assert.equal(GradeHelper.nextGrade("11"), "12");
  assert.equal(GradeHelper.nextGrade("12"), "Graduated");
  assert.equal(GradeHelper.nextGrade("Graduated"), null);
  assert.equal(GradeHelper.nextGrade("bogus"), null);
});
