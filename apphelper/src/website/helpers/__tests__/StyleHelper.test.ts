import { describe, expect, it } from "vitest";
import { StyleHelper } from "../StyleHelper";

const sections = [
  {
    id: "s1",
    styles: { all: { "font-family": "Oswald" } },
    elements: [
      { id: "e1", styles: { all: { "font-family": "Playfair Display", color: "#FFF" } } },
      { id: "e2", styles: { desktop: { "font-family": "Arial" }, mobile: { "font-family": "IBM Plex Sans" } } },
      { id: "e3", elements: [{ id: "e4", styles: { all: { "font-family": "Oswald" } } }] },
      { id: "e5", styles: { all: { "font-family": "var(--bodyFont)" } } }
    ]
  }
];

describe("StyleHelper fonts", () => {
  it("collects distinct element fonts, skipping system fonts and tokens", () => {
    expect(StyleHelper.getFontFamilies(sections).sort()).toEqual(["IBM Plex Sans", "Oswald", "Playfair Display"]);
  });

  it("builds one google font url per family with spaces escaped", () => {
    expect(StyleHelper.getFontUrls(sections)).toContain("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&display=swap");
  });

  it("applies an element font to headings inside it, not just the wrapper", () => {
    const css = StyleHelper.getCss(sections);
    expect(css).toContain("#el-e1 h1, #el-e1 h2, #el-e1 h3, #el-e1 h4, #el-e1 h5, #el-e1 h6 { font-family: Playfair Display; }");
  });

  it("leaves elements without a font untouched", () => {
    expect(StyleHelper.getCss([{ id: "s2", elements: [{ id: "e6", styles: { all: { color: "#FFF" } } }] }])).not.toContain("h6");
  });
});
