import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

const { questions, get, post } = vi.hoisted(() => {
  const questions: any[] = [
    { id: "Q1", formId: "F1", title: "Attending", fieldType: "Yes/No" },
    { id: "Q2", formId: "F1", title: "Guest count", fieldType: "Whole Number", required: true, showIf: { questionId: "Q1", value: "True" } },
    { id: "Q3", formId: "F1", title: "Diet", fieldType: "Checkbox", choices: [{ value: "veg", text: "Vegetarian" }, { value: "gf", text: "Gluten free" }] },
    { id: "Q4", formId: "F1", title: "Gluten notes", fieldType: "Textbox", showIf: { questionId: "Q3", value: "gf" } },
    { id: "Q5", formId: "F1", title: "Diet details", fieldType: "Textbox", showIf: { questionId: "Q3" } },
    { id: "Q6", formId: "F1", title: "Orphaned", fieldType: "Textbox", showIf: { questionId: "gone", value: "x" } }
  ];
  return { questions, get: vi.fn(async () => questions), post: vi.fn(async (_url: string, data: any) => data) };
});

vi.mock("@churchapps/helpers", async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get, post } };
});

import { FormSubmissionEdit } from "../FormSubmissionEdit";
import { QuestionVisibility } from "../../helpers";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("QuestionVisibility", () => {
  const answers = (values: Record<string, string>) => (id: string) => (id in values ? { questionId: id, value: values[id] } : null);
  const visible = (values: Record<string, string>) => QuestionVisibility.visibleQuestions(questions, answers(values)).map((q) => q.id);

  it("shows a question only when its trigger matches", () => {
    expect(visible({})).toEqual(["Q1", "Q3", "Q6"]);
    expect(visible({ Q1: "False" })).toEqual(["Q1", "Q3", "Q6"]);
    expect(visible({ Q1: "True", Q3: "veg" })).toEqual(["Q1", "Q2", "Q3", "Q5", "Q6"]);
    expect(visible({ Q3: "veg,gf" })).toEqual(["Q1", "Q3", "Q4", "Q5", "Q6"]);
  });
});

describe("FormSubmissionEdit with conditional questions", () => {
  it("hides the question, lets a hidden required question pass, and leaves its answer out", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FormSubmissionEdit formSubmissionId="" addFormId="F1" contentType="form" contentId="F1" showHeader={false} updatedFunction={() => { }} />);
    });
    expect(container.textContent).toContain("Attending");
    expect(container.textContent).not.toContain("Guest count");
    expect(container.textContent).not.toContain("Gluten notes");

    const buttons = Array.from(container.querySelectorAll("button"));
    await act(async () => { buttons[buttons.length - 1].click(); });

    expect(post).toHaveBeenCalledTimes(1);
    const submission = post.mock.calls[0][1][0];
    expect(submission.answers.map((a: any) => a.questionId)).toEqual(["Q1", "Q3", "Q6"]);

    act(() => root.unmount());
    container.remove();
  });
});
