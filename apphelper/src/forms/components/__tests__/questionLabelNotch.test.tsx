import { describe, expect, it } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { QuestionEdit } from "../QuestionEdit";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const title = "Any dietary needs or allergies?";

// The outlined border's gap is sized from a hidden copy of the label in its legend; the visible label is bold, so the legend must be bold too.
const renderLegend = async (fieldType: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <ThemeProvider theme={createTheme()}>
        <QuestionEdit
          question={{ id: "q1", title, fieldType, choices: [{ value: "none", text: "None" }] }}
          answer={{ questionId: "q1", value: "" }}
          changeFunction={() => { }}
        />
      </ThemeProvider>
    );
  });

  const legend = container.querySelector(".MuiOutlinedInput-notchedOutline legend") as HTMLElement;
  const result = { text: legend?.textContent || "", fontWeight: legend ? getComputedStyle(legend).fontWeight : "" };
  act(() => root.unmount());
  container.remove();
  return result;
};

describe("QuestionEdit label notch", () => {
  it.each(["Date", "Multiple Choice"])("sizes the %s border notch from a bold copy of the label", async (fieldType) => {
    const { text, fontWeight } = await renderLegend(fieldType);
    expect(text).toContain(title);
    expect(["700", "bold"]).toContain(fontWeight);
  });
});
