import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Locale } from "../Locale";

const map = (tag: string) => (Locale as any).mapBrowserLanguage(tag);
const localeDir = join(dirname(fileURLToPath(import.meta.url)), "../../../public/locales");

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

describe("Locale.supportedLanguages", () => {
  const supported: string[] = (Locale as any).supportedLanguages;

  it("includes Japanese so ja browsers get the ja locale files", () => {
    expect(supported).toContain(map("ja-JP"));
  });

  // zh-TW is the one supported language with no file of its own; it falls back to zh.
  it("ships a locale file for every supported language", () => {
    const files = readdirSync(localeDir);
    supported.filter((lang) => lang !== "zh-TW")
      .forEach((lang) => expect(files, lang).toContain(`${lang}.json`));
  });
});

describe("locale files", () => {
  // Reverse of the WHATWG windows-1252 decode table, which — unlike strict CP1252 —
  // passes 0x81/0x8D/0x8F/0x90/0x9D straight through as the matching code point.
  const toByte = new Map<string, number>();
  for (let b = 0; b < 256; b++) {
    toByte.set(new TextDecoder("windows-1252").decode(Uint8Array.of(b)), b);
  }
  const utf8 = new TextDecoder("utf-8", { fatal: true });

  // UTF-8 that was read back as windows-1252 comes out double-encoded, so Japanese
  // renders as "ã‚­ãƒ£ãƒ³ã‚»ãƒ«" instead of "キャンセル".
  const isMojibake = (value: string) => {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++) {
      const byte = toByte.get(value[i]);
      if (byte === undefined) return false;
      bytes[i] = byte;
    }
    try {
      return utf8.decode(bytes) !== value;
    } catch {
      return false;
    }
  };

  const findMojibake = (node: unknown, prefix: string, found: string[]) => {
    if (typeof node === "string") {
      if (isMojibake(node)) found.push(`${prefix} = ${node}`);
    } else if (node && typeof node === "object") {
      Object.entries(node as Record<string, unknown>).forEach(([key, value]) =>
        findMojibake(value, prefix ? `${prefix}.${key}` : key, found));
    }
  };

  readdirSync(localeDir).filter((f) => f.endsWith(".json")).forEach((file) => {
    it(`${file} is stored as clean UTF-8`, () => {
      const found: string[] = [];
      findMojibake(JSON.parse(readFileSync(join(localeDir, file), "utf8")), "", found);
      expect(found).toEqual([]);
    });
  });
});

describe("Locale.label English fallbacks", () => {
  it("resolves the SSO button labels instead of returning the raw keys", () => {
    expect(Locale.label("login.continueGoogle")).toBe("Continue with Google");
    expect(Locale.label("login.continueMicrosoft")).toBe("Continue with Microsoft");
  });
});
