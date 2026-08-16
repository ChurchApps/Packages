import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

const SAFE_HREF = /^(https?:|mailto:)/i;
const SAFE_TARGET = new Set(["_blank", "_self", "_parent", "_top"]);
const SAFE_CLASS = /^[A-Za-z_][\w-]*$/;

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isSafeHref(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (SAFE_HREF.test(trimmed)) return true;
  if (trimmed.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
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
  return markdownString.replace(/\[([^\]]+)\]\(([^)]+)\)\{([^}]+)\}/g, (match, text, url, extra) => {
    if (!match) return text;
    if (!isSafeHref(url)) return escapeHtml(text);
    return "<a href=\"" + escapeAttr(url.trim()) + "\"" + getTargetAndClasses(extra) + ">" + escapeHtml(text) + "</a>";
  });
}

export function renderMarkdownPreviewHtml(markdownString: string): string {
  const convertedText = getSpecialLinks(markdownString || "");
  let processedMarkdown = convertedText.replace(/__(.*?)__/g, (_m, t) => "<u>" + escapeHtml(t) + "</u>");
  processedMarkdown = processedMarkdown.replace(/```([\s\S]+?)```/g, (_m, t) => "<pre class=\"code-block\"><code>" + escapeHtml(t) + "</code></pre>");
  processedMarkdown = processedMarkdown.replace(/`([^`]+)`/g, (_m, t) => "<code>" + escapeHtml(t) + "</code>");
  const html = marked.parse(processedMarkdown || "", { async: false }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ["target"] });
}
