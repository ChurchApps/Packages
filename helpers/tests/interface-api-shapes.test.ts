import { test } from "node:test";
import assert from "node:assert/strict";

import {
  personWithNoSubmissions,
  personWithTwoSubmissions,
  questionWithTwoChoices,
  revisedFormSubmission,
  topLevelPlanItem
} from "../src/interfaces/apiShapePins";

test("PlanItemInterface.parentId accepts null for top-level items", () => {
  assert.equal(topLevelPlanItem.parentId, null);
});

test("PersonInterface.formSubmissions is an array of any length", () => {
  assert.equal(personWithNoSubmissions.formSubmissions?.length, 0);
  assert.equal(personWithTwoSubmissions.formSubmissions?.length, 2);
});

test("QuestionInterface.choices is an array of any length", () => {
  assert.deepEqual(questionWithTwoChoices.choices, [
    { value: "a", text: "A" },
    { value: "b", text: "B" }
  ]);
});

test("FormSubmissionInterface carries submissionDate, revisionDate and revisedBy", () => {
  assert.equal(revisedFormSubmission.revisedBy, "person1");
  assert.ok(revisedFormSubmission.submissionDate instanceof Date);
  assert.ok(revisedFormSubmission.revisionDate instanceof Date);
});
