import { describe, expect, it } from "vitest";
import React, { act, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useFormattingShortcuts } from "../FormattingPopup";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function Box() {
  const [value, setValue] = useState("Hello world");
  const ref = useRef<HTMLTextAreaElement>(null);
  const { onKeyDown, popup } = useFormattingShortcuts(ref, value, setValue);
  return <><textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={onKeyDown} />{popup}</>;
}

// ChurchAppsSupport#1474: highlight popup and Ctrl+B / Ctrl+I on plain text boxes.
describe("useFormattingShortcuts", () => {
  it("shows the popup over a selection and Ctrl+B / the Italic button format it", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<Box />); });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    await act(async () => {
      textarea.focus();
      textarea.setSelectionRange(6, 11);
      textarea.dispatchEvent(new Event("select"));
    });
    const bold = document.querySelector("[aria-label='Bold']") as HTMLButtonElement;
    expect(bold).not.toBeNull();
    expect(document.querySelector("[aria-label='Numbered list']")).not.toBeNull();

    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
    });
    expect(textarea.value).toBe("Hello **world**");

    await act(async () => {
      textarea.setSelectionRange(0, 5);
      (document.querySelector("[aria-label='Italic']") as HTMLButtonElement).click();
    });
    expect(textarea.value).toBe("_Hello_ **world**");

    act(() => root.unmount());
    container.remove();
  });
});
