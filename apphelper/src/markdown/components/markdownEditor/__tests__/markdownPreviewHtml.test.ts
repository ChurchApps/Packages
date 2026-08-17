import { describe, expect, it } from "vitest";
import { isSafeHref, isSafeImageSrc, renderMarkdownPreviewHtml } from "../markdownPreviewHtml";

const hrefs = (html: string): string[] => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
};

describe("isSafeHref", () => {
  it("allows http, https, mailto, tel and relative urls", () => {
    for (const url of [
      "https://example.com", "http://example.com/a?b=c#d", "HTTPS://EXAMPLE.COM", "mailto:a@b.com", "tel:+15555555555", "/about", "about.html", "./a/b", "#anchor", "?q=1", "foo/bar:baz"
    ]) {
      expect(isSafeHref(url), url).toBe(true);
    }
  });

  it("rejects script-bearing and unknown schemes, including obfuscated ones", () => {
    const unsafe = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "  javascript:alert(1)  ",
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "java\rscript:alert(1)",
      "java\u0000script:alert(1)",
      "jav ascript:alert(1)",
      "\u00a0javascript:alert(1)",
      "java\u2028script:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "//evil.example.com",
      "\\\\evil.example.com",
      "",
      "   "
    ];
    for (const url of unsafe) expect(isSafeHref(url), JSON.stringify(url)).toBe(false);
  });

  it("rejects parenthesized javascript urls whole, not just their prefix", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("javascript:void(0)")).toBe(false);
    expect(isSafeHref("javascript:(alert)(1)")).toBe(false);
  });
});

describe("isSafeImageSrc", () => {
  it("allows raster data urls but not svg or script schemes", () => {
    expect(isSafeImageSrc("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isSafeImageSrc("data:image/gif,x")).toBe(true);
    expect(isSafeImageSrc("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(false);
    expect(isSafeImageSrc("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("https://example.com/a.png")).toBe(true);
  });
});

describe("renderMarkdownPreviewHtml", () => {
  it("does not keep script tags or javascript: hrefs in the rendered HTML", () => {
    const html = renderMarkdownPreviewHtml("<script>alert(1)</script>\n[click](javascript:alert(1)){.btn}\n[also](javascript:void(0))");
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html.toLowerCase()).not.toContain("javascript:");
    expect(html).not.toContain("alert(1)");
  });

  it("drops javascript: links marked builds itself, keeping only the link text", () => {
    const cases = [
      "[plain](javascript:alert(1))",
      "[void](javascript:void(0))",
      "[nested](javascript:(alert)(1))",
      "[titled](javascript:alert(1) \"hi\")",
      "[ref][r]\n\n[r]: javascript:alert(1)",
      "<javascript:alert(1)>"
    ];
    for (const markdown of cases) {
      // The URL may survive as inert text; what must not survive is an href.
      const html = renderMarkdownPreviewHtml(markdown);
      expect(html.toLowerCase(), markdown).not.toContain("href=");
      expect(hrefs(html), markdown).toHaveLength(0);
    }
  });

  it("drops javascript: urls obfuscated with characters browsers ignore", () => {
    for (const url of ["java\tscript:alert(1)", "java\nscript:alert(1)", "java\u0000script:alert(1)", "java script:alert(1)"]) {
      const html = renderMarkdownPreviewHtml("[x](" + url + "){.btn}\n\n<a href=\"" + url + "\">raw</a>");
      // eslint-disable-next-line no-control-regex
      const found = hrefs(html).join(" ").replace(/[\u0000-\u0020]/g, "");
      expect(found.toLowerCase(), url).not.toContain("javascript:");
    }
  });

  it("drops data: special-link hrefs", () => {
    const html = renderMarkdownPreviewHtml("[x](data:text/html,<script>alert(1)</script>){.btn}");
    expect(html.toLowerCase()).not.toContain("data:");
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("drops data: hrefs marked builds itself and data: image sources that are not raster", () => {
    const html = renderMarkdownPreviewHtml("[a](data:text/html,<script>alert(1)</script>)\n\n![b](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)");
    expect(html.toLowerCase()).not.toContain("data:");
    expect(html.toLowerCase()).not.toContain("<script");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("img")).toBeNull();
  });

  it("strips javascript: and data: hrefs from raw HTML in the markdown", () => {
    const html = renderMarkdownPreviewHtml("<a href=\"javascript:alert(1)\">x</a>\n<a href=\"data:text/html,<b>y</b>\">y</a>\n<img src=\"javascript:alert(1)\">");
    expect(html.toLowerCase()).not.toContain("javascript:");
    expect(html.toLowerCase()).not.toContain("data:");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("a[href]")).toBeNull();
    expect(doc.querySelector("img[src]")).toBeNull();
  });

  it("rejects protocol-relative special links", () => {
    const html = renderMarkdownPreviewHtml("[x](//evil.example.com){.btn}");
    expect(html).not.toContain("evil.example.com");
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

  it("keeps parentheses inside an otherwise safe special-link url", () => {
    const html = renderMarkdownPreviewHtml("[Wiki](https://example.com/a_(b)){.btn}");
    expect(hrefs(html)).toEqual(["https://example.com/a_(b)"]);
    expect(html).toContain("class=\"btn\"");
  });

  it("keeps relative special links and normal markdown", () => {
    const html = renderMarkdownPreviewHtml("[Home](/about){.nav}\n\n**bold** and [docs](https://example.com)");
    expect(html).toContain("href=\"/about\"");
    expect(html).toContain("class=\"nav\"");
    expect(html).toMatch(/<strong>bold<\/strong>|<b>bold<\/b>/);
    expect(html).toContain("href=\"https://example.com\"");
    expect(html).toContain("docs");
  });

  it("keeps ordinary images and link titles", () => {
    const html = renderMarkdownPreviewHtml("![logo](https://example.com/a.png \"Logo\")\n\n[docs](/help \"Help\")");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("img")?.getAttribute("src")).toBe("https://example.com/a.png");
    expect(doc.querySelector("img")?.getAttribute("alt")).toBe("logo");
    expect(doc.querySelector("a")?.getAttribute("title")).toBe("Help");
  });

  it("keeps underline and code markup", () => {
    const html = renderMarkdownPreviewHtml("See __note__ and `code`");
    expect(html).toContain("<u>note</u>");
    expect(html).toContain("<code>code</code>");
  });
});
