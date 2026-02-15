import React from "react";
import { ButtonGroup, IconButton, Tooltip } from "@mui/material";
import { FormatAlignLeft, FormatAlignCenter, FormatAlignRight, FormatAlignJustify } from "@mui/icons-material";
import { FORMAT_ELEMENT_COMMAND } from "lexical";

interface Props { editor: any; elementFormat: string; }

export function AlignmentControls({ editor, elementFormat }: Props) {
  return (
    <ButtonGroup size="small" variant="outlined">
      <Tooltip title="Align Left"><IconButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")} className={elementFormat === "left" || elementFormat === "" ? "active" : ""} size="small"><FormatAlignLeft /></IconButton></Tooltip>
      <Tooltip title="Align Center"><IconButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")} className={elementFormat === "center" ? "active" : ""} size="small"><FormatAlignCenter /></IconButton></Tooltip>
      <Tooltip title="Align Right"><IconButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")} className={elementFormat === "right" ? "active" : ""} size="small"><FormatAlignRight /></IconButton></Tooltip>
      <Tooltip title="Justify"><IconButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")} className={elementFormat === "justify" ? "active" : ""} size="small"><FormatAlignJustify /></IconButton></Tooltip>
    </ButtonGroup>
  );
}

