import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(async () => [
    { id: "H1", formId: "F1", title: "About you", fieldType: "Heading", required: true },
    { id: "Q1", formId: "F1", title: "Name", fieldType: "Textbox" }
  ]),
  post: vi.fn(async (_url: string, data: any) => data)
}));

vi.mock("@churchapps/helpers", async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get, post } };
});

import { QuestionEdit } from "../QuestionEdit";
import { FormSubmissionEdit } from "../FormSubmissionEdit";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("Question descriptions", () => {
  it("render as Markdown", () => {
    const html = renderToStaticMarkup(
      <QuestionEdit
        question={{ id: "q1", title: "Name", fieldType: "Textbox", description: "**Bold** and [a link](https://example.com)" }}
        answer={{ questionId: "q1", value: "" }}
        changeFunction={() => { }}
      />
    );
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("href=\"https://example.com\"");
  });

  it("strip unsafe links", () => {
    const html = renderToStaticMarkup(
      <QuestionEdit question={{ id: "q1", title: "Name", fieldType: "Textbox", description: "[x](javascript:alert(1))" }} answer={{ questionId: "q1", value: "" }} changeFunction={() => { }} />
    );
    expect(html).not.toContain("javascript:");
  });
});

describe("Heading questions", () => {
  it("store no answer and are never required", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FormSubmissionEdit formSubmissionId="" addFormId="F1" contentType="form" contentId="F1" showHeader={false} updatedFunction={() => { }} />);
    });
    expect(container.textContent).toContain("About you");

    const buttons = Array.from(container.querySelectorAll("button"));
    await act(async () => { buttons[buttons.length - 1].click(); });

    expect(post).toHaveBeenCalledTimes(1);
    const submission = post.mock.calls[0][1][0];
    expect(submission.answers.map((a: any) => a.questionId)).toEqual(["Q1"]);

    act(() => root.unmount());
    container.remove();
  });
});
