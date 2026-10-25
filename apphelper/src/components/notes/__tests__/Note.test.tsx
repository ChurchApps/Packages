import { describe, expect, it } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { DateHelper } from "@churchapps/helpers";
import { Note } from "../Note";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ChurchAppsSupport#1373: notes showed only the relative age ("3d"), never when they were written.
describe("Note", () => {
  it("shows the full date and time next to the relative age", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const timeSent = new Date(Date.now() - 3 * 86400 * 1000 - 60 * 1000);
    const message: any = { id: "MSG1", content: "Called about the retreat", timeSent, personId: "PER2", person: { name: { display: "Donald Clark" } } };

    await act(async () => {
      root.render(<Note message={message} showEditNote={() => {}} context={{ person: { id: "PER1" } } as any} />);
    });
    const stamp = container.querySelector("[data-testid='note-timestamp']") as HTMLElement;
    const full = DateHelper.prettyDateTime(timeSent);
    expect(full).not.toBe("");
    expect(stamp).not.toBeNull();
    expect(stamp.textContent).toBe(`${full} · 3d`);
    expect(stamp.getAttribute("title")).toBe(full);

    act(() => root.unmount());
    container.remove();
  });
});
