import { afterEach, beforeEach, describe, expect, it } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RRuleEditor } from "../RRuleEditor";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const groupedMinWidthIsZero = (button: HTMLElement) => {
  if (getComputedStyle(button).minWidth === "0px" || getComputedStyle(button).minWidth === "0") return true;
  // Fall back to the emotion stylesheet: a rule targeting .MuiButtonGroup-grouped that sets min-width to 0.
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules) as CSSStyleRule[]) {
      if (!rule.selectorText?.includes(".MuiButtonGroup-grouped")) continue;
      if (!Array.from(button.parentElement?.classList || []).some(c => rule.selectorText.includes("." + c))) continue;
      const minWidth = rule.style?.getPropertyValue("min-width");
      if (minWidth === "0" || minWidth === "0px") return true;
    }
  }
  return false;
};

describe("RRuleEditor weekly day row", () => {
  it("fits all seven weekday buttons in a full-width row", async () => {
    await act(async () => { root.render(<RRuleEditor start={new Date(2026, 9, 24)} rRule="FREQ=WEEKLY;INTERVAL=1;BYDAY=SA" onChange={() => {}} />); });

    const buttons = Array.from(container.querySelectorAll<HTMLElement>("[data-testid^=\"weekday-\"]"));
    expect(buttons).toHaveLength(7);
    const saturday = buttons[buttons.length - 1];
    expect(saturday.getAttribute("data-testid")).toBe("weekday-s-button");
    expect(saturday.textContent).toBe("S");

    const group = saturday.closest(".MuiButtonGroup-root") as HTMLElement;
    expect(group).not.toBeNull();
    expect(group.classList.contains("MuiButtonGroup-fullWidth")).toBe(true);

    expect(saturday.classList.contains("MuiButtonGroup-grouped")).toBe(true);
    expect(groupedMinWidthIsZero(saturday)).toBe(true);

    const grid = group.closest(".MuiGrid-root") as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid.classList.contains("MuiGrid-grid-xs-12")).toBe(true);
    expect(grid.classList.contains("MuiGrid-grid-sm-5")).toBe(true);
  });
});
