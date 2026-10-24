import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

const post = vi.fn().mockResolvedValue([]);
vi.mock("@churchapps/helpers", async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, post: (...args: any[]) => post(...args) } };
});

import { SubscriptionToggle } from "../SubscriptionToggle";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ChurchAppsSupport#1344: the bell kept its old icon after a click, so a second click posted the same
// "on" marker again instead of muting, and each click added another marker to the thread.
describe("SubscriptionToggle", () => {
  it("flips the bell after a click so the next click mutes", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const messages: any[] = [];

    await act(async () => {
      root.render(<SubscriptionToggle conversationId="CNV1" messages={messages} personId="PER1" />);
    });
    const button = () => container.querySelector("[data-testid='subscription-toggle']") as HTMLButtonElement;
    expect(button().getAttribute("aria-label")).toBe("Enable notifications");

    await act(async () => { button().click(); });
    expect(post).toHaveBeenLastCalledWith("/messages", [{ conversationId: "CNV1", messageType: "subscription", content: "on" }], "MessagingApi");
    expect(button().getAttribute("aria-label")).toBe("Mute notifications");

    await act(async () => { button().click(); });
    expect(post).toHaveBeenLastCalledWith("/messages", [{ conversationId: "CNV1", messageType: "subscription", content: "off" }], "MessagingApi");

    act(() => root.unmount());
    container.remove();
  });
});
