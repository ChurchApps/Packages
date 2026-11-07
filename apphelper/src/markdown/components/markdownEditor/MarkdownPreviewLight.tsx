import { renderMarkdownPreviewHtml } from "./markdownPreviewHtml";

interface Props {
	value: string;
	textAlign?: "left" | "center" | "right"
	// Keep single line breaks, as chat messages and notes rely on them.
	breaks?: boolean
}

export function MarkdownPreviewLight({ value: markdownString = "", textAlign, breaks }: Props) {
  if (markdownString === null || markdownString === undefined || !markdownString) return <></>;
  const html = renderMarkdownPreviewHtml(markdownString, { breaks });
  const style = (textAlign) ? { textAlign } : {};
  return <div style={style} dangerouslySetInnerHTML={{ __html: html }}></div>;
}
