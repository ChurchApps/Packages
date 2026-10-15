import { describe, expect, it } from "vitest";
import { AppearanceHelper } from "../AppearanceHelper";

describe("AppearanceHelper.getLogoByTextColor", () => {
  it("uses the light-background logo behind dark text keywords", () => {
    expect(AppearanceHelper.getLogoByTextColor("logoLight", "logoDark", "dark")).toBe("logoLight");
    expect(AppearanceHelper.getLogoByTextColor("logoLight", "logoDark", "darkAccent")).toBe("logoLight");
  });

  it("uses the dark-background logo behind light text keywords", () => {
    expect(AppearanceHelper.getLogoByTextColor("logoLight", "logoDark", "light")).toBe("logoDark");
  });
});
