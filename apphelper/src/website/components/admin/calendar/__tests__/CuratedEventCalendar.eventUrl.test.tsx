import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// react-big-calendar needs real layout to click an event; render a button that selects the first event instead.
vi.mock("react-big-calendar", () => ({
  momentLocalizer: () => ({}),
  Calendar: (props: any) => <button data-testid="select-event" onClick={() => props.onSelectEvent(props.events[0])}>select</button>
}));

import { CuratedEventCalendar } from "../CuratedEventCalendar";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const start = new Date(2026, 0, 4, 10, 0, 0);
const end = new Date(2026, 0, 4, 11, 0, 0);
const events = [{ id: "CUR1", realEventId: "EVT9", title: "Youth Night", start, end }] as any[];

let container: HTMLDivElement;
let root: Root;
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const renderAndClick = async (eventUrl?: (e: any) => string) => {
  await act(async () => { root.render(<CuratedEventCalendar events={events} mode="view" eventUrl={eventUrl} />); });
  const button = container.querySelector("[data-testid=\"select-event\"]") as HTMLElement;
  expect(button).not.toBeNull();
  await act(async () => { button.click(); });
};

describe("CuratedEventCalendar eventUrl", () => {
  it("navigates to eventUrl instead of opening the curated display modal", async () => {
    await renderAndClick((e) => "/events/" + ((e as { realEventId?: string }).realEventId || e.id));
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith("/events/EVT9");
    expect(document.querySelector("[role=\"dialog\"]")).toBeNull();
  });

  it("opens the curated display modal when eventUrl is not set", async () => {
    await renderAndClick();
    expect(assign).not.toHaveBeenCalled();
    const dialog = document.querySelector("[role=\"dialog\"]");
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("Youth Night");
  });
});
