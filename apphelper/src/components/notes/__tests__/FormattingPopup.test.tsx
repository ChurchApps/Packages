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

// ChurchAppsSupport#1474: format buttons and Ctrl+B / Ctrl+I on plain text boxes.
// ChurchAppsSupport#1545: the buttons are an inline row under the box while it has focus, not a popup over a selection.
describe("useFormattingShortcuts", () => {
  it("shows the format row when the box has focus and Ctrl+B / the Italic button format a selection", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<Box />); });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    expect(container.querySelector("[data-testid='formatting-popup']")).toBeNull();
    await act(async () => {
      textarea.focus();
      textarea.setSelectionRange(11, 11);
    });
    const row = container.querySelector("[data-testid='formatting-popup']") as HTMLElement;
    expect(row).not.toBeNull();
    for (const label of ["Bold", "Italic", "Bulleted list", "Numbered list"]) expect(row.querySelector(`[aria-label='${label}']`)).not.toBeNull();
    expect(textarea.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await act(async () => { textarea.setSelectionRange(6, 11); });

    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
    });
    expect(textarea.value).toBe("Hello **world**");

    await act(async () => {
      textarea.setSelectionRange(0, 5);
      (document.querySelector("[aria-label='Italic']") as HTMLButtonElement).click();
    });
    expect(textarea.value).toBe("_Hello_ **world**");

    // The buttons put focus back on the box in the next frame; let that land before leaving the box.
    await act(async () => { await new Promise((r) => requestAnimationFrame(r)); });
    await act(async () => { textarea.blur(); });
    expect(container.querySelector("[data-testid='formatting-popup']")).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it("Bulleted list prefixes the caret's line when nothing is selected", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<Box />); });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    await act(async () => {
      textarea.focus();
      textarea.setSelectionRange(0, 0);
    });
    await act(async () => {
      (container.querySelector("[aria-label='Bulleted list']") as HTMLButtonElement).click();
    });
    expect(textarea.value).toBe("- Hello world");

    act(() => root.unmount());
    container.remove();
  });
});
