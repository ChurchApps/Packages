import React from "react";
import { ButtonGroup, IconButton, Tooltip } from "@mui/material";
import { FormatListBulleted, FormatListNumbered, FormatQuote, HorizontalRule } from "@mui/icons-material";
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, $isListNode, ListNode } from "@lexical/list";
import { $getSelection, $isRangeSelection, $createParagraphNode } from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { $createQuoteNode, $isQuoteNode } from "@lexical/rich-text";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { $getNearestNodeOfType } from "@lexical/utils";

interface Props { editor: any; blockType: string; }

export function ListsAndElementsControls({ editor, blockType }: Props) {
  const formatBulletList = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
        const parentList = $getNearestNodeOfType(anchorNode, ListNode);
        const type = $isListNode(element) ? element.getListType() : parentList?.getListType();

        if (type === "bullet") {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        } else {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        }
      }
    });
  };

  const formatNumberedList = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
        const parentList = $getNearestNodeOfType(anchorNode, ListNode);
        const type = $isListNode(element) ? element.getListType() : parentList?.getListType();

        if (type === "number") {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        } else {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        }
      }
    });
  };

  const insertQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

        if ($isQuoteNode(element)) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      }
    });
  };

  return (
    <ButtonGroup size="small" variant="outlined">
      <Tooltip title="Bullet List"><IconButton onClick={formatBulletList} className={blockType === "bullet" ? "active" : ""} size="small"><FormatListBulleted /></IconButton></Tooltip>
      <Tooltip title="Numbered List"><IconButton onClick={formatNumberedList} className={blockType === "number" ? "active" : ""} size="small"><FormatListNumbered /></IconButton></Tooltip>
      <Tooltip title="Quote"><IconButton onClick={insertQuote} className={blockType === "quote" ? "active" : ""} size="small"><FormatQuote /></IconButton></Tooltip>
      <Tooltip title="Horizontal Rule"><IconButton onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)} size="small"><HorizontalRule /></IconButton></Tooltip>
    </ButtonGroup>
  );
}

