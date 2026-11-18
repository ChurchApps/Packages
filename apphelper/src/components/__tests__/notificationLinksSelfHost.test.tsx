import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@churchapps/helpers", async (orig) => {
  const actual: any = await orig();
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get } };
});

import { CommonEnvironmentHelper } from "@churchapps/helpers";
import { Notifications } from "../wrapper/Notifications";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const context: any = { userChurch: { church: { id: "CHU1", subDomain: "church" } } };

const renderDrawer = async (appName: string, notifications: any[]) => {
  get.mockResolvedValue(notifications);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<Notifications appName={appName} context={context} onNavigate={() => {}} onUpdate={() => {}} />);
  });
  return { container, root };
};

describe("Notification links on a self-hosted install", () => {
  const openSpy = vi.fn();
  const saved = { b1: CommonEnvironmentHelper.B1Root, admin: CommonEnvironmentHelper.B1AdminRoot };

  beforeEach(() => {
    get.mockReset();
    openSpy.mockReset();
    vi.stubGlobal("open", openSpy);
    CommonEnvironmentHelper.B1Root = "https://mychurch.example.org";
    CommonEnvironmentHelper.B1AdminRoot = "https://mychurch.example.org/admin";
  });

  afterEach(() => {
    CommonEnvironmentHelper.B1Root = saved.b1;
    CommonEnvironmentHelper.B1AdminRoot = saved.admin;
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("opens View Details on the install's own member site, not <subDomain>.b1.church", async () => {
    const { container, root } = await renderDrawer("B1Admin", [{ id: "N1", message: "You were scheduled", link: "/mobile/plans/PLA1", isNew: true }]);
    const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes("View Details"))!;
    await act(async () => { button.click(); });
    expect(openSpy).toHaveBeenCalledWith("https://mychurch.example.org/mobile/plans/PLA1", "_blank");
    act(() => root.unmount());
  });

  it("opens task notifications on the install's own admin site from the member site", async () => {
    const { container, root } = await renderDrawer("B1", [{ id: "N2", message: "New task", contentType: "task", contentId: "TSK1", isNew: true }]);
    const row = container.querySelector("#notification-item-N2") as HTMLElement;
    await act(async () => { row.click(); });
    expect(openSpy).toHaveBeenCalledWith("https://mychurch.example.org/admin/serving/tasks/TSK1", "_blank");
    act(() => root.unmount());
  });

  it("keeps hosted links on <subDomain>.b1.church", async () => {
    CommonEnvironmentHelper.B1Root = "https://{key}.b1.church";
    const { container, root } = await renderDrawer("B1Admin", [{ id: "N3", message: "Scheduled", link: "/mobile/plans/PLA2", isNew: true }]);
    const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes("View Details"))!;
    await act(async () => { button.click(); });
    expect(openSpy).toHaveBeenCalledWith("https://church.b1.church/mobile/plans/PLA2", "_blank");
    act(() => root.unmount());
  });
});
