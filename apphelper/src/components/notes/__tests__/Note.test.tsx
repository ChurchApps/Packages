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

describe("Note formatting", () => {
  it("renders markdown in the note text and keeps line breaks", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const message: any = { id: "MSG2", content: "**Reminder:** bring a Bible\nsee you\n\n- milk\n- eggs", timeSent: new Date(), personId: "PER2", person: { name: { display: "Donald Clark" } } };

    await act(async () => {
      root.render(<Note message={message} showEditNote={() => {}} context={{ person: { id: "PER1" } } as any} />);
    });
    const content = container.querySelector("[data-testid='note-content']") as HTMLElement;
    expect(content.querySelector("strong")?.textContent).toBe("Reminder:");
    expect(content.querySelector("br")).not.toBeNull();
    expect(Array.from(content.querySelectorAll("li")).map((li) => li.textContent)).toEqual(["milk", "eggs"]);
    expect(content.textContent).not.toContain("**");

    act(() => root.unmount());
    container.remove();
  });
});
