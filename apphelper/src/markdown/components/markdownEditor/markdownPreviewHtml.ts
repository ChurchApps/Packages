import { Marked, type Tokens } from "marked";
import DOMPurify from "isomorphic-dompurify";

// Schemes we are willing to emit. Anything outside this list - javascript:,
// data:, vbscript:, unknown app schemes - is dropped rather than allowed
// through, so a scheme never becomes safe just by being unrecognized.
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
// Browsers throw away control characters and stray whitespace while resolving a
// URL, so "java\tscript:alert(1)" still navigates as javascript:. Strip them
// before looking for a scheme instead of testing the raw string. This is the
// same character set DOMPurify ignores, so our check is never the looser one.
// eslint-disable-next-line no-control-regex
const URL_IGNORED_CHARS = /[\u0000-\u0020\u00a0\u1680\u180e\u2000-\u2029\u205f\u3000]/g;
// data: URLs are only ever allowed as raster image sources; svg+xml is excluded
// because it carries markup.
const SAFE_IMAGE_DATA = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp)[,;]/i;
const SAFE_TARGET = new Set(["_blank", "_self", "_parent", "_top"]);
const SAFE_CLASS = /^[A-Za-z_][\w-]*$/;
// [text](url){extra}, where url may contain one level of balanced parentheses so
// "javascript:alert(1)" is checked whole instead of being silently truncated to
// a prefix that a later change might read as harmless.
const SPECIAL_LINK = /\[([^\]]+)\]\(((?:[^()]|\([^()]*\))*)\)\{([^}]+)\}/g;

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalizeUrl(url: string): string {
  return (url || "").replace(URL_IGNORED_CHARS, "");
}

export function isSafeHref(url: string): boolean {
  const normalized = normalizeUrl(url);
  if (!normalized) return false;
  // "//evil.com" and "\\evil.com" inherit the current scheme; treat both as absolute.
  if (/^[/\\]{2}/.test(normalized)) return false;
  const scheme = SCHEME.exec(normalized);
  if (scheme) return SAFE_SCHEMES.has(scheme[0].toLowerCase());
  // No scheme matched, but a colon in the first path segment can still be read
  // as one, so relative URLs must not contain it.
  return !normalized.split(/[/?#]/, 1)[0].includes(":");
}

export function isSafeImageSrc(url: string): boolean {
  if (SAFE_IMAGE_DATA.test(normalizeUrl(url))) return true;
  return isSafeHref(url);
}

function getTargetAndClasses(extra: string): string {
  let result = "";
  const matches = extra.match(/\.[^( |})]+/g);
  if (matches && matches.length > 0) {
    const classes = matches.map((m) => m.replaceAll(".", "")).filter((c) => SAFE_CLASS.test(c));
    if (classes.length > 0) result = " class=\"" + escapeAttr(classes.join(" ")) + "\"";
  }
  const targets = /:target="([^"]+)"/.exec(extra);
  if (targets && SAFE_TARGET.has(targets[1])) result += " target=\"" + escapeAttr(targets[1]) + "\"";
  return result;
}

function getSpecialLinks(markdownString: string): string {
  if (!markdownString) return "";
  return markdownString.replace(SPECIAL_LINK, (match, text, url, extra) => {
    if (!match) return text;
    if (!isSafeHref(url)) return escapeHtml(text);
    return "<a href=\"" + escapeAttr(url.trim()) + "\"" + getTargetAndClasses(extra) + ">" + escapeHtml(text) + "</a>";
  });
}

// Links marked builds itself - [x](javascript:alert(1)), autolinks, reference
// links - never reach getSpecialLinks, so gate them at the renderer rather than
// leaving DOMPurify as the only thing between a javascript: URL and the DOM.
const markedInstance = new Marked({ async: false });
markedInstance.use({
  renderer: {
    link({ href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      if (!isSafeHref(href)) return text;
      const titleAttr = title ? " title=\"" + escapeAttr(title) + "\"" : "";
      return "<a href=\"" + escapeAttr(href.trim()) + "\"" + titleAttr + ">" + text + "</a>";
    },
    image({ href, title, text }: Tokens.Image) {
      if (!isSafeImageSrc(href)) return escapeHtml(text || "");
      const titleAttr = title ? " title=\"" + escapeAttr(title) + "\"" : "";
      return "<img src=\"" + escapeAttr(href.trim()) + "\" alt=\"" + escapeAttr(text || "") + "\"" + titleAttr + ">";
    }
  }
});

// Raw <a href="javascript:..."> written directly in the markdown bypasses the
// renderer, so re-apply the same allowlist to whatever DOMPurify hands back.
function stripUnsafeUrls(node: Element): void {
  if (typeof node.getAttribute !== "function") return;
  const href = node.getAttribute("href");
  if (href !== null && !isSafeHref(href)) node.removeAttribute("href");
  const src = node.getAttribute("src");
  if (src !== null && !isSafeImageSrc(src)) node.removeAttribute("src");
  const xlink = node.getAttribute("xlink:href");
  if (xlink !== null && !isSafeHref(xlink)) node.removeAttribute("xlink:href");
}

export function renderMarkdownPreviewHtml(markdownString: string): string {
  const convertedText = getSpecialLinks(markdownString || "");
  let processedMarkdown = convertedText.replace(/__(.*?)__/g, (_m, t) => "<u>" + escapeHtml(t) + "</u>");
  processedMarkdown = processedMarkdown.replace(/```([\s\S]+?)```/g, (_m, t) => "<pre class=\"code-block\"><code>" + escapeHtml(t) + "</code></pre>");
  processedMarkdown = processedMarkdown.replace(/`([^`]+)`/g, (_m, t) => "<code>" + escapeHtml(t) + "</code>");
  const html = markedInstance.parse(processedMarkdown || "", { async: false }) as string;
  // The hook is added and removed around this one synchronous call so we never
  // change DOMPurify's behaviour for anything else in the host app.
  DOMPurify.addHook("afterSanitizeAttributes", stripUnsafeUrls);
  try {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ["target"] });
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes");
  }
}
