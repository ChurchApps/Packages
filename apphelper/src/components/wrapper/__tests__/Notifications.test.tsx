import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

vi.mock("@churchapps/helpers", async (importOriginal) => {
  const actual: any = await importOriginal();
  const notifications = [{ id: "n1", churchId: "c1", contentType: "task", contentId: "TSK1", message: "New task", timeSent: new Date(), isNew: true }];
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get: vi.fn().mockResolvedValue(notifications) } };
});

import { Notifications } from "../Notifications";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("Notifications click", () => {
  it("sends a task notification to the B1Admin serving task page", async () => {
    const onNavigate = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const context: any = { userChurch: { church: { id: "c1", subDomain: "grace" } } };

    await act(async () => {
      root.render(<Notifications appName="B1Admin" context={context} onNavigate={onNavigate} onUpdate={() => {}} />);
    });

    const item = container.querySelector("#notification-item-n1") as HTMLElement;
    expect(item).not.toBeNull();
    await act(async () => { item.click(); });

    expect(onNavigate).toHaveBeenCalledWith("/serving/tasks/TSK1");
    act(() => root.unmount());
    container.remove();
  });
});
