import { describe, expect, it } from "vitest";
import { Locale } from "../Locale";

const map = (tag: string) => (Locale as any).mapBrowserLanguage(tag);

describe("Locale.mapBrowserLanguage", () => {
  it("maps Traditional Chinese region/script tags to zh-TW", () => {
    ["zh-TW", "zh-HK", "zh-MO", "zh-Hant", "zh-Hant-TW"].forEach((tag) => expect(map(tag)).toBe("zh-TW"));
  });

  it("keeps Simplified and ambiguous Chinese on zh", () => {
    ["zh", "zh-CN", "zh-SG", "zh-Hans", "zh-Hans-CN", "zh-Hans-TW"].forEach((tag) => expect(map(tag)).toBe("zh"));
  });

  it("ignores subtag casing", () => {
    expect(map("zh-tw")).toBe("zh-TW");
    expect(map("ZH-HANT")).toBe("zh-TW");
    expect(map("zh-cn")).toBe("zh");
  });

  it("collapses other languages to their primary subtag", () => {
    expect(map("fr-CA")).toBe("fr");
    expect(map("en-US")).toBe("en");
  });

  it("still maps Norwegian variants onto the no locale", () => {
    expect(map("nb-NO")).toBe("no");
    expect(map("nn")).toBe("no");
  });
});
