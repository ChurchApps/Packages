import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";

vi.mock("@churchapps/helpers", async (importOriginal) => {
  const actual: any = await importOriginal();
  const notifications = [
    { id: "n1", churchId: "c1", contentType: "task", contentId: "TSK1", message: "New task", timeSent: new Date(), isNew: true },
    { id: "n2", churchId: "c1", contentType: "form", contentId: "FRM1", message: "New Form Submission: Guest Card", timeSent: new Date(), isNew: true },
    { id: "n3", churchId: "c1", contentType: "groupJoinRequest", contentId: "GJR1", message: "Donald Clark requested to join Youth Group", link: "/mobile/groups/GRP1", timeSent: new Date(), isNew: true }
  ];
  return { ...actual, ApiHelper: { ...actual.ApiHelper, get: vi.fn().mockResolvedValue(notifications), delete: vi.fn().mockResolvedValue({}) } };
});

import { ApiHelper } from "@churchapps/helpers";
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

  const row = container.querySelector(`[data-testid="notification-row-${id}"]`) as HTMLElement;
  const item = buttonText
    ? Array.from(row.querySelectorAll("button")).find((b) => b.textContent === buttonText) as HTMLElement
    : container.querySelector("#notification-item-" + id) as HTMLElement;
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

describe("Notifications colors", () => {
  // Without their own color the rows would show the browser's black button text on a dark theme.
  it("gives each row the theme's text color so it reads on a dark background", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const context: any = { userChurch: { church: { id: "c1", subDomain: "grace" } } };
    const theme = createTheme({ palette: { mode: "dark" } });
    // jsdom has no user-agent stylesheet; this is the browser's default for buttons.
    const uaButton = document.createElement("style");
    uaButton.textContent = "button { color: rgb(0, 0, 0); }";
    document.head.appendChild(uaButton);

    await act(async () => {
      root.render(<ThemeProvider theme={theme}><Notifications appName="B1Admin" context={context} onNavigate={() => {}} onUpdate={() => {}} /></ThemeProvider>);
    });

    const row = container.querySelector("#notification-item-n1") as HTMLElement;
    expect(getComputedStyle(row).color).toBe("rgb(255, 255, 255)");

    act(() => root.unmount());
    container.remove();
    uaButton.remove();
  });
});

const renderPanel = async (props: Partial<React.ComponentProps<typeof Notifications>> = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const context: any = { userChurch: { church: { id: "c1", subDomain: "grace" } } };
  const onNavigate = vi.fn();
  await act(async () => {
    root.render(<Notifications appName="B1Admin" context={context} onNavigate={onNavigate} onUpdate={() => {}} {...props} />);
  });
  const cleanup = () => { act(() => root.unmount()); container.remove(); };
  return { container, onNavigate, cleanup };
};

describe("Notifications structure", () => {
  it("never nests a button inside another button", async () => {
    const { container, cleanup } = await renderPanel();
    const interactive = "button, [role='button'], a[href]";
    const nested = Array.from(container.querySelectorAll(interactive)).filter((el) => el.parentElement?.closest(interactive));
    expect(nested).toHaveLength(0);
    cleanup();
  });

  it("keeps the delete and View Details buttons beside the row's main target", async () => {
    const { container, cleanup } = await renderPanel();
    const main = container.querySelector("#notification-item-n3") as HTMLElement;
    const del = container.querySelector('[data-testid="notification-delete-n3"]') as HTMLElement;
    const row = container.querySelector('[data-testid="notification-row-n3"]') as HTMLElement;
    const viewDetails = Array.from(row.querySelectorAll("button")).find((b) => b.textContent === "View Details") as HTMLElement;
    expect(main).not.toBeNull();
    expect(del).not.toBeNull();
    expect(viewDetails).toBeTruthy();
    expect(main.contains(del)).toBe(false);
    expect(main.contains(viewDetails)).toBe(false);
    expect(del.getAttribute("aria-label")).toBe("Delete notification");
    expect(container.querySelector("#notifications-list")).not.toBeNull();
    cleanup();
  });

  it("deleting a notification does not also open it", async () => {
    const { container, onNavigate, cleanup } = await renderPanel();
    const del = container.querySelector('[data-testid="notification-delete-n1"]') as HTMLElement;
    await act(async () => { del.click(); });
    expect(onNavigate).not.toHaveBeenCalled();
    expect(container.querySelector("#notification-item-n1")).toBeNull();
    cleanup();
  });

  it("opens a notification from the keyboard", async () => {
    const { container, onNavigate, cleanup } = await renderPanel();
    const main = container.querySelector("#notification-item-n1") as HTMLElement;
    expect(main.tabIndex).toBe(0);
    await act(async () => {
      main.focus();
      main.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onNavigate).toHaveBeenCalledWith("/serving/tasks/TSK1");
    cleanup();
  });
});

describe("Notifications heading", () => {
  it("shows its own Notifications heading by default", async () => {
    const { container, cleanup } = await renderPanel();
    expect(container.querySelector("h2")?.textContent).toBe("Notifications");
    expect(container.querySelector('[data-testid="notifications-clear-all"]')?.textContent).toBe("Clear All");
    cleanup();
  });

  it("drops the heading when hideTitle is set (a dialog title already names it) but keeps Clear All", async () => {
    const { container, cleanup } = await renderPanel({ hideTitle: true });
    expect(container.querySelector("h2")).toBeNull();
    expect(container.textContent).not.toContain("Notifications");
    expect(container.querySelector('[data-testid="notifications-clear-all"]')).not.toBeNull();
    cleanup();
  });

  it("asks with the Clear all notifications? label before clearing", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { container, cleanup } = await renderPanel();
    await act(async () => { (container.querySelector('[data-testid="notifications-clear-all"]') as HTMLElement).click(); });
    expect(confirm).toHaveBeenCalledWith("Clear all notifications?");
    expect(container.querySelectorAll('[data-testid^="notification-delete-"]')).toHaveLength(3);
    confirm.mockRestore();
    cleanup();
  });
});

describe("Notifications empty state", () => {
  it("shows the empty message and no Clear All button", async () => {
    (ApiHelper.get as any).mockResolvedValueOnce([]);
    const { container, cleanup } = await renderPanel();
    const empty = container.querySelector("#notifications-empty") as HTMLElement;
    expect(empty.textContent).toContain("No notifications");
    expect(empty.textContent).toContain("You're all caught up!");
    expect(container.querySelector('[data-testid="notifications-clear-all"]')).toBeNull();
    cleanup();
  });
});
