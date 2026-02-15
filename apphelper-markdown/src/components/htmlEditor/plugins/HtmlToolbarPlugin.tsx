import React, { useCallback, useEffect, useState } from "react";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  $isTextNode
} from "lexical";
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingTagType
} from "@lexical/rich-text";
import {
  $isListNode,
  ListNode
} from "@lexical/list";
import {
  $isLinkNode,
  TOGGLE_LINK_COMMAND
} from "@lexical/link";
// Table support removed
// import {
//   INSERT_TABLE_COMMAND
// } from '@lexical/table';


import { $createCodeNode } from "@lexical/code";
import { $setBlocksType, $patchStyleText } from "@lexical/selection";
import { $getNearestNodeOfType } from "@lexical/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { Divider } from "@mui/material";
import { HistoryControls } from "./toolbarParts/HistoryControls";
import { BlockAndFontControls } from "./toolbarParts/BlockAndFontControls";
import { TextFormattingControls } from "./toolbarParts/TextFormattingControls";
import { ColorsAndLinkControls } from "./toolbarParts/ColorsAndLinkControls";
import { AlignmentControls } from "./toolbarParts/AlignmentControls";
import { ListsAndElementsControls } from "./toolbarParts/ListsAndElementsControls";
import { SourceToggleControl } from "./toolbarParts/SourceToggleControl";

interface Props {
  setIsLinkEditMode: (value: boolean) => void;
  isSourceMode?: boolean;
  setIsSourceMode?: (value: boolean) => void;
}

const FONT_SIZES = [
  "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"
];

export default function HtmlToolbarPlugin({ setIsLinkEditMode, isSourceMode = false, setIsSourceMode }: Props) {
  const [editor] = useLexicalComposerContext();
  const [blockType, setBlockType] = useState("paragraph");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [fontSize, setFontSize] = useState("16px");
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [elementFormat, setElementFormat] = useState<string>("left");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
        }
      }

      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsCode(selection.hasFormat("code"));
      setIsSuperscript(selection.hasFormat("superscript"));
      setIsSubscript(selection.hasFormat("subscript"));

      const node = selection.anchor.getNode();
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      // Get element format/alignment
      const elementNode = anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
      const format = (elementNode as any).getFormatType ? (elementNode as any).getFormatType() : "left";
      setElementFormat(format || "left");
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, updateToolbar]);

  const formatHeading = (headingSize: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      }
    });
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (isCode) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createCodeNode());
        }
      }
    });
  };

  const insertLink = () => {
    if (!isLink) {
      setIsLinkEditMode(true);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  const applyTextColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "color": color });
      }
    });
    setTextColor(color);
    // Do not auto-close; allow users to keep the picker open while typing RGB/HEX
  };

  const applyBgColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "background-color": color });
      }
    });
    setBgColor(color);
    // Do not auto-close; allow users to keep the picker open while typing RGB/HEX
  };

  const openNativeColorPicker = (
    initialColor: string,
    onColor: (val: string) => void,
    anchorEl?: HTMLElement
  ) => {
    const input = document.createElement("input");
    input.type = "color";
    input.value = initialColor || "#000000";
    input.tabIndex = -1;
    input.style.position = "fixed";
    // Place the input near the clicked control so the native picker anchors nearby
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      input.style.left = `${Math.round(rect.left)}px`;
      input.style.top = `${Math.round(rect.bottom)}px`;
    } else {
      // Fallback: place near top-left but within viewport
      input.style.left = "12px";
      input.style.top = "12px";
    }
    // Keep it tiny but focusable/interactive so browsers anchor correctly
    input.style.width = "24px";
    input.style.height = "24px";
    input.style.opacity = "0.01";
    input.style.zIndex = "2147483647";
    input.style.background = "transparent";
    input.style.border = "0";
    input.style.padding = "0";
    input.style.margin = "0";
    input.style.pointerEvents = "auto";
    document.body.appendChild(input);

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.value) onColor(target.value);
    };
    const cleanup = () => {
      input.removeEventListener("input", handleInput);
      input.removeEventListener("change", handleInput);
      if (input.parentNode) input.parentNode.removeChild(input);
    };
    input.addEventListener("input", handleInput);
    input.addEventListener("change", () => {
      // Finalize selection; input event already applied live updates
      cleanup();
    });
    input.addEventListener("blur", () => {
      // Close without change
      cleanup();
    });

    // Open the native color picker, prefer showPicker when available
    try {
      input.focus();
      // @ts-ignore - showPicker not in all TS lib defs yet
      if (typeof input.showPicker === "function") {
        // @ts-ignore
        input.showPicker();
      } else {
        input.click();
      }
    } catch {
      input.click();
    }
  };

  const applyFontSize = (size: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.getNodes().forEach(node => {
          if ($isTextNode(node)) {
            const currentStyle = node.getStyle() || "";
            const newStyle = currentStyle.replace(/font-size:\s*[^;]+;?/, "");
            node.setStyle(`${newStyle} font-size: ${size};`);
          }
        });
      }
    });
    setFontSize(size);
  };

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.getNodes().forEach(node => {
          if ($isTextNode(node)) {
            node.setStyle("");
            node.setFormat(0);
          }
        });
      }
    });
  };

  return (
    <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
      <HistoryControls editor={editor} />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <BlockAndFontControls
        blockType={blockType}
        onFormatHeading={(tag) => formatHeading(tag as HeadingTagType)}
        onFormatParagraph={formatParagraph}
        onFormatCode={formatCode}
        onApplyFontSize={applyFontSize}
      />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <TextFormattingControls
        editor={editor}
        isBold={isBold}
        isItalic={isItalic}
        isUnderline={isUnderline}
        isStrikethrough={isStrikethrough}
        isSuperscript={isSuperscript}
        isSubscript={isSubscript}
        isCode={isCode}
        onClearFormatting={clearFormatting}
      />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ColorsAndLinkControls
        textColor={textColor}
        bgColor={bgColor}
        isLink={isLink}
        onOpenPicker={openNativeColorPicker}
        onApplyTextColor={applyTextColor}
        onApplyBgColor={applyBgColor}
        onInsertLink={insertLink}
      />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <AlignmentControls editor={editor} elementFormat={elementFormat} />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ListsAndElementsControls editor={editor} blockType={blockType} />

      {setIsSourceMode && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <SourceToggleControl isSourceMode={isSourceMode} setIsSourceMode={setIsSourceMode} />
        </>
      )}
    </div>
  );
}
