import React from "react";
import { ButtonGroup, IconButton, Tooltip } from "@mui/material";
import { FormatBold, FormatItalic, FormatUnderlined, StrikethroughS, Superscript, Subscript, Code, FormatClear } from "@mui/icons-material";
import { FORMAT_TEXT_COMMAND } from "lexical";

interface Props {
  editor: any;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  isSuperscript: boolean;
  isSubscript: boolean;
  isCode: boolean;
  onClearFormatting: () => void;
}

export function TextFormattingControls({ editor, isBold, isItalic, isUnderline, isStrikethrough, isSuperscript, isSubscript, isCode, onClearFormatting }: Props) {
  return (
    <>
      <ButtonGroup size="small" variant="outlined">
        <Tooltip title="Bold"><IconButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} className={isBold ? "active" : ""} size="small"><FormatBold /></IconButton></Tooltip>
        <Tooltip title="Italic"><IconButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} className={isItalic ? "active" : ""} size="small"><FormatItalic /></IconButton></Tooltip>
        <Tooltip title="Underline"><IconButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} className={isUnderline ? "active" : ""} size="small"><FormatUnderlined /></IconButton></Tooltip>
        <Tooltip title="Strikethrough"><IconButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")} className={isStrikethrough ? "active" : ""} size="small"><StrikethroughS /></IconButton></Tooltip>
      </ButtonGroup>

      <ButtonGroup size="small" variant="outlined">
        <Tooltip title="Superscript"><IconButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript")} className={isSuperscript ? "active" : ""} size="small"><Superscript /></IconButton></Tooltip>
        <Tooltip title="Subscript"><IconButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript")} className={isSubscript ? "active" : ""} size="small"><Subscript /></IconButton></Tooltip>
        <Tooltip title="Code"><IconButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")} className={isCode ? "active" : ""} size="small"><Code /></IconButton></Tooltip>
        <Tooltip title="Clear Formatting"><IconButton onClick={onClearFormatting} size="small"><FormatClear /></IconButton></Tooltip>
      </ButtonGroup>
    </>
  );
}

