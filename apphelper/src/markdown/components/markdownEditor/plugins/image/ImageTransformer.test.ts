import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { createEditor } from "lexical";
import { describe, expect, it } from "vitest";
import { $createImageNode } from "./ImageNode";
import { IMAGE } from "./ImageTransformer";

const md = "![logo](https://example.com/a.png)";

function editorWithImage() {
  return createEditor({
    namespace: "image-test",
    nodes: [IMAGE.dependencies[0]],
    onError: (e) => { throw e; }
  });
}

describe("IMAGE markdown transformer", () => {
  it("matches ![alt](src) and not a plain markdown link", () => {
    expect(IMAGE.importRegExp.test(md)).toBe(true);
    expect(md.match(IMAGE.regExp)?.[1]).toBe("logo");
    expect(md.match(IMAGE.regExp)?.[2]).toBe("https://example.com/a.png");
    expect(IMAGE.importRegExp.test("[logo](https://example.com/a.png)")).toBe(false);
  });

  it("exports an ImageNode as markdown", () => {
    const editor = editorWithImage();
    let exported: string | null = null;
    editor.update(() => {
      exported = IMAGE.export($createImageNode({ altText: "logo", src: "https://example.com/a.png" }), () => "", () => "");
    }, { discrete: true });
    expect(exported).toBe(md);
  });

  it("round-trips ![alt](src) through convertFrom/ToMarkdownString", () => {
    const editor = editorWithImage();
    editor.update(() => {
      $convertFromMarkdownString(md, [IMAGE]);
    }, { discrete: true });

    let out = "";
    editor.getEditorState().read(() => {
      out = $convertToMarkdownString([IMAGE]);
    });
    expect(out.trim()).toBe(md);
  });
});
