import { renderMarkdownPreviewHtml } from "./markdownPreviewHtml";

interface Props {
	value: string;
	textAlign?: "left" | "center" | "right"
}

export function MarkdownPreviewLight({ value: markdownString = "", textAlign }: Props) {
  if (markdownString === null || markdownString === undefined || !markdownString) return <></>;
  const html = renderMarkdownPreviewHtml(markdownString);
  const style = (textAlign) ? { textAlign } : {};
  return <div style={style} dangerouslySetInnerHTML={{ __html: html }}></div>;
}
