import { describe, it, expect } from "vitest";
import { topLevelElement } from "./elementParentIdPin";

describe("ElementInterface", () => {
  it("accepts null parentId for top-level elements", () => {
    expect(topLevelElement.parentId).toBeNull();
  });
});
