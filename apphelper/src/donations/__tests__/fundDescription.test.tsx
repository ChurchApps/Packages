import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { FundDonation } from "../components/FundDonation";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const funds: any[] = [
  { id: "F1", name: "Building", description: "New roof and <b>parking</b> lot" },
  { id: "F2", name: "General" }
];

let root: ReturnType<typeof createRoot> | null = null;
const render = (fundId: string, hideFundSelect = false) => {
  const container = document.createElement("div");
  root = createRoot(container);
  act(() => {
    root!.render(<FundDonation fundDonation={{ fundId, amount: 25 }} funds={funds} index={0} updatedFunction={() => {}} hideFundSelect={hideFundSelect} />);
  });
  return container;
};

describe("Fund description on the giving form", () => {
  afterEach(() => { act(() => root?.unmount()); root = null; });

  it("shows the selected fund's description as plain text", () => {
    const el = render("F1").querySelector("[data-testid='fund-description']");
    expect(el?.textContent).toBe("New roof and <b>parking</b> lot");
    expect(el?.querySelector("b")).toBeNull();
  });

  it("shows it on a fund giving link, where the fund select is hidden", () => {
    expect(render("F1", true).querySelector("[data-testid='fund-description']")?.textContent).toContain("New roof");
  });

  it("shows nothing for a fund without a description", () => {
    expect(render("F2").querySelector("[data-testid='fund-description']")).toBeNull();
  });
});
