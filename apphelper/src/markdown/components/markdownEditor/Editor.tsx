"use client";

import React, { useCallback, useMemo } from "react";
import "./editor.css";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS, $convertToMarkdownString, $convertFromMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { theme } from "./theme";
import { ToolbarPlugin, CustomAutoLinkPlugin, ListMaxIndentLevelPlugin, PLAYGROUND_TRANSFORMERS, ReadOnlyPlugin, ControlledEditorPlugin } from "./plugins";
import FloatingTextFormatToolbarPlugin from "./plugins/FloatingTextMenu/FloatingTextFormatToolbarPlugin";
import { MarkdownModal } from "./MarkdownModal";
import CustomLinkNodePlugin from "./plugins/customLink/CustomLinkNodePlugin";
import { CustomLinkNode } from "./plugins/customLink/CustomLinkNode";
import EmojisPlugin from "./plugins/emoji/EmojisPlugin";
import { EmojiNode } from "./plugins/emoji/EmojiNode";
import EmojiPickerPlugin from "./plugins/emoji/EmojiPickerPlugin";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  mode?: "interactive" | "preview";
  style?: any;
  textAlign?: "left" | "center" | "right";
  placeholder?: string;
  element?: any;
  showFloatingEditor?: boolean;
}

function Editor({ value, onChange = () => {}, mode = "interactive", textAlign = "left", style, placeholder = "Enter some text...", showFloatingEditor = false, ...props }: Props) {
  const [fullScreen, setFullScreen] = React.useState(false);

  const handleChange = useCallback((editorState: any) => {
    editorState.read(() => {
      const markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
      onChange(markdown);
    });
  }, [onChange]);

  const onError = useCallback((error: any) => {
    console.error(error);
  }, []);

  const handleModalOnChange = useCallback((value: string) => {
    onChange(value);
  }, [onChange]);

  const handleCloseFullScreen = useCallback(() => {
    setFullScreen(false);
  }, []);

  const initialConfig = useMemo(() => ({
    editorState: () => $convertFromMarkdownString(value, PLAYGROUND_TRANSFORMERS),
    namespace: "editor",
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      CustomLinkNode,
      EmojiNode,
      {
        replace: LinkNode,
        with: (node: LinkNode) => (
          new CustomLinkNode(node.getURL(), node.getTarget() ?? "_self", [])
        )
      }
    ],
    markdown: { transformers: PLAYGROUND_TRANSFORMERS }
  }), [value, onError]);

  const textAlignClass = useMemo(() => {
    switch (textAlign) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      case "left":
      default:
        return "text-left";
    }
  }, [textAlign]);

  return (
    <>
      <LexicalComposer initialConfig={initialConfig}>
        <div
          id="markdown-editor-container"
          className={mode === "preview" ? `editor-container preview ${textAlignClass}` : `editor-container ${textAlignClass}`}
          style={useMemo(() => Object.assign({ border: mode === "preview" ? "none" : "1px solid lightgray" }, style), [mode, style])}
        >
          {mode !== "preview" && (<ToolbarPlugin goFullScreen={useCallback(() => { setFullScreen(true); }, [])} />)}
          <div id="markdown-editor-inner" className="editor-inner">
            {!fullScreen && (
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    id="markdown-editor-content"
                    className="editor-input"
                    style={{ minHeight: mode === "preview" ? "auto" : "150px" }}
                    data-element={JSON.stringify(props.element)}
                  />
                }
                placeholder={mode !== "preview" ? (<div id="markdown-editor-placeholder" className="editor-placeholder">{placeholder}</div>) : null}
                ErrorBoundary={LexicalErrorBoundary}
              />
            )}
            <CustomLinkNodePlugin />
            {mode !== "preview" && <EmojiPickerPlugin />}
            <EmojisPlugin />
            {showFloatingEditor && <FloatingTextFormatToolbarPlugin />}
            <OnChangePlugin onChange={handleChange} />
            {mode !== "preview" && <AutoFocusPlugin />}
            <HistoryPlugin />
            <ListPlugin />
            <CustomAutoLinkPlugin />

            <ListMaxIndentLevelPlugin maxDepth={7} />
            <ReadOnlyPlugin isDisabled={mode === "preview"} />
            <ControlledEditorPlugin isFullscreen={fullScreen} value={value} isPreview={mode === "preview"} />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          </div>
        </div>
      </LexicalComposer>
      {fullScreen && (<MarkdownModal onChange={handleModalOnChange} value={value} hideModal={handleCloseFullScreen} />)}
    </>
  );
}

export default Editor;
