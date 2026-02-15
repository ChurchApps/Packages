import React, { useState, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes } from "lexical";
import { TextField, Box } from "@mui/material";
import { cleanHtml } from "../utils/cleanHtml";

interface Props {
  isSourceMode: boolean;
}

export default function HtmlSourcePlugin({ isSourceMode }: Props) {
  const [editor] = useLexicalComposerContext();
  const [htmlSource, setHtmlSource] = useState("");
  const [prevIsSourceMode, setPrevIsSourceMode] = useState(false);

  // Get HTML from editor when switching to source mode
  useEffect(() => {
    if (isSourceMode && !prevIsSourceMode) {
      editor.getEditorState().read(() => {
        const rawHtml = $generateHtmlFromNodes(editor);
        const cleanedHtml = cleanHtml(rawHtml);
        setHtmlSource(cleanedHtml);
      });
    }
    setPrevIsSourceMode(isSourceMode);
  }, [isSourceMode, prevIsSourceMode, editor]);

  // Update editor when leaving source mode
  useEffect(() => {
    if (!isSourceMode && prevIsSourceMode && htmlSource !== undefined) {
      editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlSource || "", "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);

        // Only clear and insert if we got valid nodes
        if (nodes && nodes.length > 0) {
          const root = $getRoot();
          root.clear();
          $insertNodes(nodes);
        }
      });
    }
  }, [isSourceMode, prevIsSourceMode, htmlSource, editor]);

  // Update HTML on editor changes when not in source mode
  useEffect(() => {
    if (!isSourceMode) {
      return editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const rawHtml = $generateHtmlFromNodes(editor);
          const cleanedHtml = cleanHtml(rawHtml);
          setHtmlSource(cleanedHtml);
        });
      });
    }
  }, [editor, isSourceMode]);

  if (!isSourceMode) {
    return null;
  }

  return (
    <Box sx={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: "background.paper",
      zIndex: 10,
      display: "flex",
      flexDirection: "column"
    }}>
      <TextField
        multiline
        fullWidth
        value={htmlSource}
        onChange={(e) => setHtmlSource(e.target.value)}
        placeholder="Enter HTML code..."
        variant="outlined"
        sx={{
          flex: 1,
          height: "100%",
          "& .MuiOutlinedInput-root": {
            height: "100%",
            alignItems: "flex-start",
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: "14px",
            padding: "15px 10px",
            "& fieldset": { border: "none" }
          },
          "& .MuiOutlinedInput-input": {
            height: "100%",
            minHeight: "150px",
            overflow: "auto",
            padding: 0,
            backgroundColor: "#f5f5f5",
            resize: "none"
          }
        }}
      />
    </Box>
  );
}
