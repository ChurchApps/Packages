// Compile-time pins: `yarn build` fails if these interfaces drift from what the Api sends.
// Not re-exported from the package entry.
import type { PlanItemInterface } from "./Doing.js";
import type { FormSubmissionInterface, PersonInterface, QuestionInterface } from "./Membership.js";

export const topLevelPlanItem: PlanItemInterface = { parentId: null };

export const personWithNoSubmissions: PersonInterface = { name: {}, contactInfo: {}, formSubmissions: [] };

export const personWithTwoSubmissions: PersonInterface = {
  name: {},
  contactInfo: {},
  formSubmissions: [{ id: "fs1" }, { id: "fs2" }]
};

export const questionWithTwoChoices: QuestionInterface = {
  choices: [
    { value: "a", text: "A" },
    { value: "b", text: "B" }
  ]
};

export const revisedFormSubmission: FormSubmissionInterface = {
  submissionDate: new Date(0),
  revisionDate: new Date(0),
  revisedBy: "person1"
};
