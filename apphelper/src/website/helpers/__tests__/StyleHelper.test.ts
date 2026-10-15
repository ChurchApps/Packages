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

describe("StyleHelper text color", () => {
  const globalStyles = { palette: JSON.stringify({ light: "#FFFFFF", lightAccent: "#DDDDDD", accent: "#0000DD", darkAccent: "#9999DD", dark: "#333333" }) };

  it("resolves a bare palette keyword like var(--key)", () => {
    expect(StyleHelper.getTextColor("dark", globalStyles)).toBe("#333333");
    expect(StyleHelper.getTextColor("var(--dark)", globalStyles)).toBe("#333333");
  });

  it("leaves hex values and unknown keywords alone", () => {
    expect(StyleHelper.getTextColor("#123456", globalStyles)).toBe("#123456");
    expect(StyleHelper.getTextColor("primary", globalStyles)).toBe("primary");
  });

  it("returns the bare keyword when there is no palette", () => {
    expect(StyleHelper.getTextColor("dark", {})).toBe("dark");
    expect(StyleHelper.getTextColor("light", {})).toBe("light");
  });
});
