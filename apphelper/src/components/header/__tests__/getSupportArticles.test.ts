import { describe, expect, it } from "vitest";
import { getSupportArticles } from "../getSupportArticles";

describe("getSupportArticles B1 links", () => {
  const b1 = (primaryMenuLabel: string) => getSupportArticles({ appName: "B1", primaryMenuLabel, secondaryMenuLabel: "" });

  it("points the Mobile App tour at current doc paths", () => {
    const result = b1("Mobile App");
    expect(result).toContain("docs/b1-admin/settings/mobile-app");
    expect(result).toContain("docs/b1-church/getting-started/installing-pwa");
    expect(result).not.toContain("b1/admin/portal");
    expect(result).not.toContain("b1/mobile/setup");
  });

  it("points the Website tour at current doc paths", () => {
    const result = b1("Website");
    expect(result).toContain("docs/b1-admin/website/initial-setup");
    expect(result).toContain("docs/b1-admin/website/page-editor");
    expect(result).toContain("docs/b1-admin/website/managing-pages");
    expect(result).not.toContain("b1/admin/portal");
  });

  it("points the Sermons tour at current doc paths", () => {
    const result = b1("Sermons");
    expect(result).toContain("docs/b1-admin/sermons/managing-sermons");
    expect(result).toContain("docs/b1-admin/sermons/live-streaming");
  });

  it("points the Calendars tour at current doc paths", () => {
    const result = b1("Calendars");
    expect(result).toContain("docs/b1-admin/calendars/creating-calendars");
    expect(result).not.toContain("b1/portal/calendars");
  });
});
