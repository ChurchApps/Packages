import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestionEdit } from "../QuestionEdit";

const description = "Include any allergies we should know about";

const render = (fieldType: string) => renderToStaticMarkup(
  <QuestionEdit
    question={{ id: "q1", title: "Dietary needs", fieldType, description, choices: [{ value: "a", text: "A" }] }}
    answer={{ questionId: "q1", value: "" }}
    changeFunction={() => { }}
  />
);

describe("QuestionEdit description (ChurchAppsSupport#1253)", () => {
  it.each(["Textbox", "Text Area", "Multiple Choice", "Yes/No", "Checkbox", "Date", "Heading"])("shows the description for %s", (fieldType) => {
    expect(render(fieldType)).toContain(description);
  });

  it("renders nothing extra when there is no description", () => {
    const html = renderToStaticMarkup(
      <QuestionEdit question={{ id: "q1", title: "Name", fieldType: "Textbox" }} answer={{ questionId: "q1", value: "" }} changeFunction={() => { }} />
    );
    expect(html).not.toContain("question-description");
  });
});

describe("ConversationalForm heading description (ChurchAppsSupport#1253)", () => {
  it("shows the description under a Heading step", async () => {
    const { ConversationalForm } = await import("../ConversationalForm");
    const html = renderToStaticMarkup(
      <ConversationalForm
        questions={[{ id: "h1", title: "About you", fieldType: "Heading", description }]}
        getAnswer={() => null}
        renderInput={() => null}
        errors={[]}
        setErrors={() => { }}
        isSubmitting={false}
        onSubmit={() => { }}
      />
    );
    expect(html).toContain(description);
  });
});
