import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

vi.mock("@churchapps/helpers", async (importOriginal) => {
  const actual: any = await importOriginal();
  const pms = [{ id: "pm1", fromPersonId: "p2", toPersonId: "p1", notifyPersonId: "p1", conversation: { messages: [{ id: "m1", personId: "p2", content: "Hello there", timeSent: new Date() }] } }];
  const people = [{ id: "p2", name: { display: "Jane Doe" } }];
  const get = vi.fn((url: string) => Promise.resolve(url.startsWith("/people") ? people : pms));
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get } };
});

import { PrivateMessages } from "../PrivateMessages";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const renderPanel = async (hideTitle?: boolean) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const context: any = { person: { id: "p1" }, userChurch: { church: { id: "c1" } } };
  await act(async () => {
    root.render(<PrivateMessages context={context} refreshKey={0} onUpdate={() => {}} hideTitle={hideTitle} />);
  });
  const cleanup = () => { act(() => root.unmount()); container.remove(); };
  return { container, cleanup };
};

describe("PrivateMessages list", () => {
  it("keeps the delete button beside the conversation's main target, not inside it", async () => {
    const { container, cleanup } = await renderPanel();
    const interactive = "button, [role='button'], a[href]";
    const nested = Array.from(container.querySelectorAll(interactive)).filter((el) => el.parentElement?.closest(interactive));
    expect(nested).toHaveLength(0);
    const main = container.querySelector('[data-testid="conversation-item-pm1"]') as HTMLElement;
    const del = container.querySelector('[data-testid="conversation-delete-pm1"]') as HTMLElement;
    expect(main.textContent).toContain("Jane Doe");
    expect(del).not.toBeNull();
    expect(main.contains(del)).toBe(false);
    cleanup();
  });

  it("shows its Messages heading by default and hides it when hideTitle is set", async () => {
    const shown = await renderPanel();
    expect(shown.container.querySelector("h1")?.textContent).toBe("Messages");
    shown.cleanup();

    const hidden = await renderPanel(true);
    expect(hidden.container.querySelector("h1")).toBeNull();
    expect(hidden.container.textContent).toContain("1 conversation");
    hidden.cleanup();
  });
});
