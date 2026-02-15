import React from "react";
import { ButtonGroup, IconButton, Tooltip } from "@mui/material";
import { FormatColorText, FormatColorFill, Link as LinkIcon } from "@mui/icons-material";

interface Props {
  textColor: string;
  bgColor: string;
  isLink: boolean;
  onOpenPicker: (initialColor: string, onColor: (val: string) => void, anchorEl?: HTMLElement) => void;
  onApplyTextColor: (val: string) => void;
  onApplyBgColor: (val: string) => void;
  onInsertLink: () => void;
}

export function ColorsAndLinkControls({ textColor, bgColor, isLink, onOpenPicker, onApplyTextColor, onApplyBgColor, onInsertLink }: Props) {
  return (
    <ButtonGroup size="small" variant="outlined">
      <Tooltip title="Text Color">
        <IconButton onClick={(e) => onOpenPicker(textColor, onApplyTextColor, e.currentTarget)} size="small">
          <FormatColorText />
        </IconButton>
      </Tooltip>
      <Tooltip title="Background Color">
        <IconButton onClick={(e) => onOpenPicker(bgColor, onApplyBgColor, e.currentTarget)} size="small">
          <FormatColorFill />
        </IconButton>
      </Tooltip>
      <Tooltip title="Insert Link">
        <IconButton onClick={onInsertLink} className={isLink ? "active" : ""} size="small">
          <LinkIcon />
        </IconButton>
      </Tooltip>
    </ButtonGroup>
  );
}

