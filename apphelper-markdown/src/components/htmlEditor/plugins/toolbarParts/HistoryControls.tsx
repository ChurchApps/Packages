import React from "react";
import { IconButton, ButtonGroup, Tooltip } from "@mui/material";
import { Undo, Redo } from "@mui/icons-material";
import { UNDO_COMMAND, REDO_COMMAND } from "lexical";

interface Props {
  editor: any;
}

export function HistoryControls({ editor }: Props) {
  return (
    <ButtonGroup size="small" variant="outlined">
      <Tooltip title="Undo">
        <IconButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} size="small">
          <Undo />
        </IconButton>
      </Tooltip>
      <Tooltip title="Redo">
        <IconButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} size="small">
          <Redo />
        </IconButton>
      </Tooltip>
    </ButtonGroup>
  );
}

