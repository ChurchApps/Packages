import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

vi.mock("@churchapps/helpers", async (importOriginal) => {
  const actual: any = await importOriginal();
  const notifications = [
    { id: "n1", churchId: "c1", contentType: "task", contentId: "TSK1", message: "New task", timeSent: new Date(), isNew: true },
    { id: "n2", churchId: "c1", contentType: "form", contentId: "FRM1", message: "New Form Submission: Guest Card", timeSent: new Date(), isNew: true },
    { id: "n3", churchId: "c1", contentType: "groupJoinRequest", contentId: "GJR1", message: "Donald Clark requested to join Youth Group", link: "/mobile/groups/GRP1", timeSent: new Date(), isNew: true }
  ];
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get: vi.fn().mockResolvedValue(notifications) } };
});

import { Notifications } from "../Notifications";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const clickNotification = async (id: string, buttonText?: string) => {
  const onNavigate = vi.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const context: any = { userChurch: { church: { id: "c1", subDomain: "grace" } } };

  await act(async () => {
    root.render(<Notifications appName="B1Admin" context={context} onNavigate={onNavigate} onUpdate={() => {}} />);
  });

  const row = container.querySelector("#notification-item-" + id) as HTMLElement;
  const item = buttonText ? Array.from(row.querySelectorAll("button")).find((b) => b.textContent === buttonText) as HTMLElement : row;
  expect(item).not.toBeNull();
  await act(async () => { item.click(); });

  act(() => root.unmount());
  container.remove();
  return onNavigate;
};

describe("Notifications click", () => {
  it("sends a task notification to the B1Admin serving task page", async () => {
    const onNavigate = await clickNotification("n1");
    expect(onNavigate).toHaveBeenCalledWith("/serving/tasks/TSK1");
  });

  it("sends a form submission notification to the form's submissions tab", async () => {
    const onNavigate = await clickNotification("n2");
    expect(onNavigate).toHaveBeenCalledWith("/forms/FRM1?tab=submissions");
  });

  it("opens a join-request notification's member-site group link on the church's B1 site", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const onNavigate = await clickNotification("n3");
    expect(onNavigate).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith("https://grace.b1.church/mobile/groups/GRP1", "_blank");
    open.mockRestore();
  });

  it("points View Details for a member-site link at the church's B1 site", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    await clickNotification("n3", "View Details");
    expect(open).toHaveBeenCalledWith("https://grace.b1.church/mobile/groups/GRP1", "_blank");
    open.mockRestore();
  });
});
