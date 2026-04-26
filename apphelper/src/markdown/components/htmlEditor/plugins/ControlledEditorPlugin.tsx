import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes } from "lexical";

interface Props {
  value: string
}

export default function ControlledEditorPlugin({ value }: Props) {
  const [editor] = useLexicalComposerContext();
  const isInitialized = useRef(false);
  const lastValue = useRef(value);

  useEffect(() => {
    // Only update if this is the initial load or if the external value actually changed
    // (not from internal editor changes)
    if (!isInitialized.current || (value !== lastValue.current && value)) {
      editor.update(() => {
        const root = $getRoot();

        // Only clear and set content on initial load or when external value changes
        if (!isInitialized.current) {
          root.clear();

          const parser = new DOMParser();
          const dom = parser.parseFromString(value, "text/html");
          const nodes = $generateNodesFromDOM(editor, dom);
          $insertNodes(nodes);
        }
      });
      isInitialized.current = true;
      lastValue.current = value;
    }
  }, [value, editor]);

  return null;
}
