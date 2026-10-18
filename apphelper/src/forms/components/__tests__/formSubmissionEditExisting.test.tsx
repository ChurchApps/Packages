import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

// Mirrors the Api: GET /formsubmissions/:id only adds questions and answers when include names them.
const { get } = vi.hoisted(() => ({
  get: vi.fn(async (url: string) => {
    const submission: any = { id: "FS1", formId: "F1", contentType: "person", contentId: "P1" };
    if (url.includes("include=questions,answers")) {
      submission.questions = [{ id: "Q1", formId: "F1", title: "Favorite Color", fieldType: "Textbox" }];
      submission.answers = [{ id: "A1", formSubmissionId: "FS1", questionId: "Q1", value: "Blue" }];
    }
    return submission;
  })
}));

vi.mock("@churchapps/helpers", async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get } };
});

import { FormSubmissionEdit } from "../FormSubmissionEdit";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("FormSubmissionEdit with an existing submission (ChurchAppsSupport#1282)", () => {
  it("loads the submission's questions and answers so they can be edited", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FormSubmissionEdit formSubmissionId="FS1" addFormId="" contentType="person" contentId="P1" showHeader={false} updatedFunction={() => { }} />);
    });

    expect(container.textContent).toContain("Favorite Color");
    const input = container.querySelector("input[type='text'], input:not([type])") as HTMLInputElement;
    expect(input?.value).toBe("Blue");

    act(() => root.unmount());
    container.remove();
  });
});
