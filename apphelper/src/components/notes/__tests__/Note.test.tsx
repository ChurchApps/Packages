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

// ChurchAppsSupport#1487: admins who can open the audit log get "(edited)" linked to the record's note history.
describe("Note history link", () => {
  const edited: any = { id: "MSG3", content: "Visit moved to Friday", timeSent: new Date("2026-11-01T10:00:00Z"), timeUpdated: new Date("2026-11-02T10:00:00Z"), personId: "PER2", person: { name: { display: "Donald Clark" } } };

  const render = async (historyLink?: string) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Note message={edited} showEditNote={() => {}} context={{ person: { id: "PER1" } } as any} historyLink={historyLink} />);
    });
    return { container, done: () => { act(() => root.unmount()); container.remove(); } };
  };

  it("keeps the plain (edited) caption without a history link", async () => {
    const { container, done } = await render();
    expect(container.textContent).toContain("(edited)");
    expect(container.querySelector("[data-testid='note-history-link']")).toBeNull();
    done();
  });

  it("links (edited) to the history when a link is given", async () => {
    const link = "/settings/audit-log?module=messaging&entityType=note&entityId=PER2";
    const { container, done } = await render(link);
    const a = container.querySelector("[data-testid='note-history-link']") as HTMLAnchorElement;
    expect(a).not.toBeNull();
    expect(a.tagName).toBe("A");
    expect(a.getAttribute("href")).toBe(link);
    expect(a.textContent).toBe("(edited · view history)");
    done();
  });
});
