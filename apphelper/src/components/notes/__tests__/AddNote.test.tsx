import { afterEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ApiHelper } from "../../../helpers";
import { AddNote } from "../AddNote";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ChurchAppsSupport#1475: the trash icon deleted a note straight away; it now asks first.
describe("AddNote delete", () => {
  afterEach(() => vi.restoreAllMocks());

  async function clickDelete(confirmed: boolean) {
    vi.spyOn(ApiHelper, "get").mockResolvedValue({ id: "MSG1", conversationId: "CONV1", content: "Visited in hospital" });
    const del = vi.spyOn(ApiHelper, "delete").mockResolvedValue({});
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(confirmed);
    const onUpdate = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<AddNote messageId="MSG1" conversationId="CONV1" onUpdate={onUpdate} createConversation={async () => "CONV1"} context={{ person: { id: "PER1" } } as any} />);
    });
    const trash = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "delete") as HTMLButtonElement;
    expect(trash).toBeTruthy();
    await act(async () => { trash.click(); });
    act(() => root.unmount());
    container.remove();
    return { del, confirm, onUpdate };
  }

  it("does not delete when the confirmation is cancelled", async () => {
    const { del, confirm, onUpdate } = await clickDelete(false);
    expect(confirm).toHaveBeenCalledWith("Delete this note? This cannot be undone.");
    expect(del).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("deletes once confirmed", async () => {
    const { del, onUpdate } = await clickDelete(true);
    expect(del).toHaveBeenCalledWith("/messages/MSG1", "MessagingApi");
    expect(onUpdate).toHaveBeenCalled();
  });
});
