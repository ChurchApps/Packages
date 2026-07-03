import { $isCodeHighlightNode } from "@lexical/code";
import { $isLinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { $convertToMarkdownString } from "@lexical/markdown";
import { $createParagraphNode, $getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_LOW, FORMAT_TEXT_COMMAND, SELECTION_CHANGE_COMMAND } from "lexical";
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import { $wrapNodes } from "@lexical/selection";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Icon, Select, MenuItem } from "@mui/material";
import { styled } from "@mui/material/styles";

import { getDOMRangeRect } from "./getDOMRangeRect";
import { getSelectedNode } from "./getSelectNode";
import { setFloatingElemPosition } from "./setFloatingElemPosition";
import { PLAYGROUND_TRANSFORMERS } from "../MarkdownTransformers";
import { ApiHelper } from "@churchapps/helpers";

export const FloatingDivContainer = styled(Box)({
  display: "flex",
  background: "#fff",
  padding: 4,
  verticalAlign: "middle",
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 1400,
  opacity: 0,
  backgroundColor: "#fff",
  boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.3)",
  borderRadius: 8,
  transition: "opacity 0.5s",
  height: 35,
  willChange: "transform"
});

function TextFormatFloatingToolbar({ editor, anchorElem, isLink, isBold, isItalic, isUnderline, isCode, isStrikethrough, isSubscript, isSuperscript, blockType, setBlockType }: any) {
  const popupCharStylesEditorRef = useRef(null);

  const applyFormatting = (command: string) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, command);
    saveChanges(editor);
  };


  function mouseMoveListener(e: any) {
    if (
      popupCharStylesEditorRef?.current &&
      (e.buttons === 1 || e.buttons === 3)
    ) {
      popupCharStylesEditorRef.current.style.pointerEvents = "none";
    }
  }
  function mouseUpListener(e: any) {
    if (popupCharStylesEditorRef?.current) {
      popupCharStylesEditorRef.current.style.pointerEvents = "auto";
    }
  }

  useEffect(() => {
    if (popupCharStylesEditorRef?.current) {
      document.addEventListener("mousemove", mouseMoveListener);
      document.addEventListener("mouseup", mouseUpListener);

      return () => {
        document.removeEventListener("mousemove", mouseMoveListener);
        document.removeEventListener("mouseup", mouseUpListener);
      };
    }
  }, [popupCharStylesEditorRef]);

  const updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection();

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
    const nativeSelection = window.getSelection();

    if (popupCharStylesEditorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement);

      setFloatingElemPosition(rangeRect, popupCharStylesEditorElem, anchorElem);
    }
  }, [editor, anchorElem]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;

    const update = () => {
      editor.getEditorState().read(() => {
        updateTextFormatFloatingToolbar();
      });
    };

    window.addEventListener("resize", update);
    if (scrollerElem) {
      scrollerElem.addEventListener("scroll", update);
    }

    return () => {
      window.removeEventListener("resize", update);
      if (scrollerElem) {
        scrollerElem.removeEventListener("scroll", update);
      }
    };
  }, [editor, updateTextFormatFloatingToolbar, anchorElem]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateTextFormatFloatingToolbar();
    });
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }: any) => {
        editorState.read(() => {
          updateTextFormatFloatingToolbar();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateTextFormatFloatingToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, updateTextFormatFloatingToolbar]);

  const formatBlock = (type: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () =>
          type === "paragraph" ? $createParagraphNode() : $createHeadingNode(type as any));
      }
    });
    setBlockType(type);
    saveChanges(editor);
  };

  return (
    <FloatingDivContainer ref={popupCharStylesEditorRef}>
      <>
        <Select
          value={blockType}
          onChange={(e) => formatBlock(e.target.value)}
          sx={{
            minWidth: 120,
            backgroundColor: "#fff",
            borderRadius: 2,
            marginRight: 0.3
          }}
          aria-label="Text format"
        >
          <MenuItem value="paragraph">Normal</MenuItem>
          <MenuItem value="h1">Heading 1</MenuItem>
          <MenuItem value="h2">Heading 2</MenuItem>
          <MenuItem value="h3">Heading 3</MenuItem>
          <MenuItem value="h4">Heading 4</MenuItem>
        </Select>
        <IconButton
          onClick={() => {
            applyFormatting("bold");
          }}
          sx={{ backgroundColor: isBold ? "#e0e0e0" : undefined, borderRadius: 2, marginRight: 0.3 }}
          aria-label="Bold"
        >
          <Icon>format_bold_outline</Icon>
        </IconButton>

        <IconButton
          onClick={() => {
            applyFormatting("italic");
          }}
          sx={{ backgroundColor: isItalic ? "#e0e0e0" : undefined, borderRadius: 2, marginRight: 0.3 }}
          aria-label="Italic"
        >
          <Icon>format_italic_outline</Icon>
        </IconButton>

        <IconButton
          onClick={() => {
            applyFormatting("underline");
          }}
          sx={{ backgroundColor: isUnderline ? "#e0e0e0" : undefined, borderRadius: 2, marginRight: 0.3 }}
          aria-label="Underline"
        >
          <Icon>format_underlined_outline</Icon>
        </IconButton>

        {/* <IconButton
            onClick={() => {
              applyFormatting("strikethrough");
            }}
            sx={{ backgroundColor: isStrikethrough ? "#e0e0e0" : undefined, borderRadius: 2, marginRight: 0.3 }}
          >
            <Icon>strikethrough_s_outline</Icon>
          </IconButton> */}

        <IconButton
          onClick={() => {
            applyFormatting("code");
          }}
          sx={{ backgroundColor: isCode ? "#e0e0e0" : undefined, borderRadius: 2, marginRight: 0.3 }}
          aria-label="Code"
        >
          <Icon>code</Icon>
        </IconButton>

        {/* <IconButton
            onClick={insertLink}
            sx={{ backgroundColor: isLink ? "#e0e0e0" : undefined, borderRadius: 2 }}
          >
            <Icon>insert_link_outline</Icon>
          </IconButton> */}
      </>
    </FloatingDivContainer>
  );
}

let lastFormattingState: any = {};

const getFormattingState = (selection: any) => {
  const node = getSelectedNode(selection);
  let blockType = "paragraph";
  if ($isHeadingNode(node)) {
    blockType = node.getTag(); // "h1", "h2", etc.
  }

  return {
    isBold: selection.hasFormat("bold"),
    isItalic: selection.hasFormat("italic"),
    isUnderline: selection.hasFormat("underline"),
    // isStrikethrough: selection.hasFormat("strikethrough"),
    isCode: selection.hasFormat("code"),
    blockType
  };
};

const saveChanges = (editor: any) => {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const newFormattingState = getFormattingState(selection); // Get current formatting

      const node = getSelectedNode(selection);
      const parentNode = node.getParent();
      let blockType = "paragraph";

      if ($isHeadingNode(parentNode)) {
        blockType = parentNode.getTag();
      } else if ($isHeadingNode(node)) {
        blockType = node.getTag();
      }

      if (JSON.stringify(newFormattingState) !== JSON.stringify(lastFormattingState) || blockType !== lastFormattingState.blockType) {
        lastFormattingState = { ...newFormattingState, blockType };

        const editorNode = editor.getRootElement();
        const elementJSON = editorNode?.dataset?.element;
        if (elementJSON) {
          const markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
          const element: any = JSON.parse(elementJSON);

          element.answers.text = markdown;
          element.answersJSON = JSON.stringify(element.answers);

          ApiHelper.post("/elements", [element], "ContentApi");
        }
      }
    }
  });
};

const updateFormattingState = (editor: any) => {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      lastFormattingState = getFormattingState(selection);
    }
  });
};

function useFloatingTextFormatToolbar(editor: any, anchorElem: any) {
  const [isText, setIsText] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      // Should not to pop up the floating toolbar when using IME input
      if (editor.isComposing()) {
        return;
      }
      const selection = $getSelection();
      const nativeSelection = window.getSelection();
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false);
        return;
      }

      if (!$isRangeSelection(selection)) {
        return;
      }

      const node = getSelectedNode(selection);

      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsSubscript(selection.hasFormat("subscript"));
      setIsSuperscript(selection.hasFormat("superscript"));
      setIsCode(selection.hasFormat("code"));

      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      if (
        !$isCodeHighlightNode(selection.anchor.getNode()) &&
        selection.getTextContent() !== ""
      ) {
        setIsText($isTextNode(node));
      } else {
        setIsText(false);
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, "");
      if (!selection.isCollapsed() && rawTextContent === "") {
        setIsText(false);
        return;
      }

      if ($isRangeSelection(selection)) {
        const text = selection.getTextContent().trim();
        if (text && JSON.stringify(lastFormattingState === "{}")) {
          updateFormattingState(editor);
        }
      }

      let type = "paragraph";
      if ($isHeadingNode(parent)) {
        type = parent.getTag();
      } else if ($isHeadingNode(node)) {
        type = node.getTag();
      }
      setBlockType(type);
    });

  }, [editor]);

  useEffect(() => {
    document.addEventListener("selectionchange", updatePopup);
    return () => {
      document.removeEventListener("selectionchange", updatePopup);
    };
  }, [updatePopup]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updatePopup();
      }),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, () => {
        updatePopup();
        return false;
      }, COMMAND_PRIORITY_LOW),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) {
          setIsText(false);
        }
      })
    );
  }, [editor, updatePopup]);

  if (!isText || isLink) {
    return null;
  }

  return createPortal(
    <TextFormatFloatingToolbar
      editor={editor}
      anchorElem={anchorElem}
      isLink={isLink}
      isBold={isBold}
      isItalic={isItalic}
      isStrikethrough={isStrikethrough}
      isSubscript={isSubscript}
      isSuperscript={isSuperscript}
      isUnderline={isUnderline}
      isCode={isCode}
      blockType={blockType}
      setBlockType={setBlockType}
    />,
    anchorElem
  );
}

export default function FloatingTextFormatToolbarPlugin({ anchorElem = document.body }) {
  const [editor] = useLexicalComposerContext();
  return useFloatingTextFormatToolbar(editor, anchorElem);
}
