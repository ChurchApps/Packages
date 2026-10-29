import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

// jsdom does not apply @media, so pin the phone stack by reading the stylesheet.
type Rule = { media: string | null; selector: string; decls: Record<string, string> };

const parse = (css: string): Rule[] => {
  const rules: Rule[] = [];
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const walk = (text: string, media: string | null) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open === -1) break;
      const prelude = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const body = text.slice(open + 1, j - 1);
      if (prelude.startsWith("@media")) walk(body, prelude.replace(/^@media\s*/, ""));
      else if (!prelude.startsWith("@")) {
        const decls: Record<string, string> = {};
        body.split(";").forEach((d) => {
          const k = d.indexOf(":");
          if (k > 0) decls[d.slice(0, k).trim()] = d.slice(k + 1).trim();
        });
        prelude.split(",").forEach((s) => rules.push({ media, selector: s.trim(), decls }));
      }
      i = j;
    }
  };
  walk(src, null);
  return rules;
};

const rules = parse(readFileSync(resolve(__dirname, "../pages.css"), "utf8"));
const decls = (selector: string, media: string | null) => {
  const merged: Record<string, string> = {};
  rules.filter((r) => r.selector === selector && r.media === media).forEach((r) => Object.assign(merged, r.decls));
  return merged;
};

describe("sermon/podcast list phone stack", () => {
  it("keeps the side-by-side row outside any media query", () => {
    const item = decls(".sermonListItem", null);
    expect(item.display).toBe("flex");
    expect(item["flex-direction"]).toBeUndefined();
    expect(decls(".sermonThumbList", null).width).toBe("220px");
  });

  it("stacks the picture above the text at 600px and below", () => {
    const phone = "(max-width: 600px)";
    const item = decls(".sermonListItem", phone);
    expect(item["flex-direction"]).toBe("column");
    expect(item["align-items"]).toBe("stretch");
    expect(decls(".sermonThumbList", phone).width).toBe("100%");
    const img = decls(".sermonThumbList img", phone);
    expect(img.height).toBe("auto");
    expect(img["aspect-ratio"]).toBe("16 / 9");
  });
});
