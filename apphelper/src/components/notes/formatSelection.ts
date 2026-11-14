export type FormatKind = "bold" | "italic" | "bullets" | "numbered";

export interface FormatResult {
  value: string;
  start: number;
  end: number;
}

const BULLET = /^- /;
const NUMBERED = /^\d+\. /;

function wrap(value: string, start: number, end: number, marker: string): FormatResult {
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  // Already wrapped right outside the selection: unwrap.
  if (before.endsWith(marker) && after.startsWith(marker)) {
    return {
      value: before.slice(0, before.length - marker.length) + selected + after.slice(marker.length),
      start: start - marker.length,
      end: end - marker.length
    };
  }
  return { value: before + marker + selected + marker + after, start: start + marker.length, end: end + marker.length };
}

function prefixLines(value: string, start: number, end: number, kind: "bullets" | "numbered"): FormatResult {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  // A selection ending right after a newline does not touch the next line.
  const lastChar = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const nextBreak = value.indexOf("\n", lastChar);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const pattern = kind === "bullets" ? BULLET : NUMBERED;
  const remove = lines.every((l) => pattern.test(l));
  const updated = lines.map((l, i) => {
    if (remove) return l.replace(pattern, "");
    const stripped = l.replace(BULLET, "").replace(NUMBERED, "");
    return (kind === "bullets" ? "- " : `${i + 1}. `) + stripped;
  });
  const block = updated.join("\n");
  const newValue = value.slice(0, lineStart) + block + value.slice(lineEnd);
  if (start === end) {
    const caret = lineStart + updated[0].length;
    return { value: newValue, start: caret, end: caret };
  }
  return { value: newValue, start: lineStart, end: lineStart + block.length };
}

// Applies one formatting action to a plain-text selection using the markdown
// that MarkdownPreviewLight renders: **bold**, _italic_, "- " and "1. " lists.
export function applyFormat(value: string, start: number, end: number, kind: FormatKind): FormatResult {
  const text = value || "";
  const s = Math.max(0, Math.min(start, end, text.length));
  const e = Math.min(Math.max(start, end), text.length);
  if (kind === "bold") return wrap(text, s, e, "**");
  if (kind === "italic") return wrap(text, s, e, "_");
  return prefixLines(text, s, e, kind);
}

const LIST_ITEM = /^(?:([-*]) |(\d+)\. )/;

// Enter inside a list line: start the next item ("- " or the next number), or end the list when the item is empty.
// Returns null when the caret is not past a list marker, so Enter inserts a plain newline.
export function continueList(value: string, caret: number): FormatResult | null {
  const text = value || "";
  const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
  const nextBreak = text.indexOf("\n", caret);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const match = LIST_ITEM.exec(text.slice(lineStart, lineEnd));
  if (!match || caret < lineStart + match[0].length) return null;
  if (text.slice(lineStart + match[0].length, lineEnd).trim() === "") {
    const newValue = text.slice(0, lineStart) + text.slice(lineEnd);
    return { value: newValue, start: lineStart, end: lineStart };
  }
  const marker = match[1] ? `${match[1]} ` : `${parseInt(match[2], 10) + 1}. `;
  const insert = "\n" + marker;
  const pos = caret + insert.length;
  return { value: text.slice(0, caret) + insert + text.slice(caret), start: pos, end: pos };
}
