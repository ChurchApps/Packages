import { describe, expect, it } from "vitest";
import { renderMarkdownPreviewHtml } from "../markdownPreviewHtml";

describe("renderMarkdownPreviewHtml", () => {
  it("does not keep script tags or javascript: hrefs in the rendered HTML", () => {
    const html = renderMarkdownPreviewHtml("<script>alert(1)</script>\n[click](javascript:alert(1)){.btn}\n[also](javascript:void(0))");
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html.toLowerCase()).not.toContain("javascript:");
    expect(html).not.toContain("alert(1)");
  });

  it("drops data: special-link hrefs", () => {
    const html = renderMarkdownPreviewHtml("[x](data:text/html,<script>alert(1)</script>){.btn}");
    expect(html.toLowerCase()).not.toContain("data:");
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("encodes attribute breakouts in special-link urls", () => {
    const html = renderMarkdownPreviewHtml("[x](https://ok.example/\" onclick=\"evil){.btn}");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("[onclick]")).toBeNull();
    expect(doc.querySelector("a")?.getAttribute("href")).toContain("https://ok.example/");
  });

  it("keeps http(s) and mailto special links with class and target", () => {
    const html = renderMarkdownPreviewHtml("[Donate](https://example.com/give){:target=\"_blank\" .btn}\n[Mail](mailto:a@b.com){.link}");
    expect(html).toContain("href=\"https://example.com/give\"");
    expect(html).toContain("class=\"btn\"");
    expect(html).toContain("target=\"_blank\"");
    expect(html).toContain("Donate");
    expect(html).toContain("href=\"mailto:a@b.com\"");
    expect(html).toContain("Mail");
  });

  it("keeps relative special links and normal markdown", () => {
    const html = renderMarkdownPreviewHtml("[Home](/about){.nav}\n\n**bold** and [docs](https://example.com)");
    expect(html).toContain("href=\"/about\"");
    expect(html).toContain("class=\"nav\"");
    expect(html).toMatch(/<strong>bold<\/strong>|<b>bold<\/b>/);
    expect(html).toContain("href=\"https://example.com\"");
    expect(html).toContain("docs");
  });

  it("keeps underline and code markup", () => {
    const html = renderMarkdownPreviewHtml("See __note__ and `code`");
    expect(html).toContain("<u>note</u>");
    expect(html).toContain("<code>code</code>");
  });
});
