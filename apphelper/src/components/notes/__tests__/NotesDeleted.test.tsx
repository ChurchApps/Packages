import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { DateHelper } from "@churchapps/helpers";

const conversation = {
  id: "CON1",
  messages: [
    { id: "MSG1", content: "First visit", timeSent: new Date("2026-11-01T10:00:00Z"), personId: "PER2", person: { name: { display: "Donald Clark" } } },
    { id: "MSG3", content: "Third visit", timeSent: new Date("2026-11-03T10:00:00Z"), personId: "PER2", person: { name: { display: "Donald Clark" } } }
  ]
};

vi.mock("../../../helpers/ConversationStore", () => ({
  ConversationStore: {
    loadByConversationId: vi.fn().mockResolvedValue(undefined),
    subscribe: (_id: string, cb: (c: any) => void) => { cb(conversation); return () => {}; }
  }
}));
vi.mock("../../../helpers/SubscriptionManager", () => ({ SubscriptionManager: { joinRoom: vi.fn().mockResolvedValue(undefined), leaveRoom: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("../AddNote", () => ({ AddNote: () => null }));

import { Notes } from "../Notes";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ChurchAppsSupport#1487: a deleted note leaves a greyed marker in place, linked to the audit log, without its old text.
describe("Notes deleted-note markers", () => {
  const deletedNotes = [{ messageId: "MSG2", displayName: "Demo User", timeSent: "2026-11-02T10:00:00Z", deletedAt: "2026-11-04T09:00:00Z" }];
  const link = "/settings/audit-log?module=messaging&entityType=note&entityId=PER2";

  const render = async (props: any) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Notes conversationId="CON1" context={{ person: { id: "PER1" }, userChurch: { church: { id: "CHU1" } } } as any} noDisplayBox {...props} />);
    });
    return { container, done: () => { act(() => root.unmount()); container.remove(); } };
  };

  it("renders a placeholder between the notes around it, with dates and the history link", async () => {
    const { container, done } = await render({ deletedNotes, historyLink: link });
    const marker = container.querySelector("[data-testid='deleted-note']") as HTMLElement;
    expect(marker).not.toBeNull();
    expect(marker.textContent).toContain("Deleted note");
    expect(marker.textContent).toContain("Demo User");
    expect(marker.textContent).toContain(DateHelper.prettyDateTime(new Date("2026-11-02T10:00:00Z")));
    expect(marker.textContent).toContain(DateHelper.prettyDateTime(new Date("2026-11-04T09:00:00Z")));
    expect((marker.querySelector("[data-testid='deleted-note-history-link']") as HTMLAnchorElement).getAttribute("href")).toBe(link);

    const text = container.textContent || "";
    expect(text.indexOf("First visit")).toBeLessThan(text.indexOf("Deleted note"));
    expect(text.indexOf("Deleted note")).toBeLessThan(text.indexOf("Third visit"));
    done();
  });

  it("shows no markers when none are passed", async () => {
    const { container, done } = await render({});
    expect(container.querySelector("[data-testid='deleted-note']")).toBeNull();
    expect(container.textContent).toContain("First visit");
    done();
  });
});
