import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Code, CodeOff } from "@mui/icons-material";

interface Props {
  isSourceMode?: boolean;
  setIsSourceMode?: (value: boolean) => void;
}

export function SourceToggleControl({ isSourceMode = false, setIsSourceMode }: Props) {
  if (!setIsSourceMode) return null;
  return (
    <Tooltip title={isSourceMode ? "Visual Editor" : "HTML Source"}>
      <IconButton onClick={() => setIsSourceMode(!isSourceMode)} className={isSourceMode ? "active" : ""} size="small">
        {isSourceMode ? <Code /> : <CodeOff />}
      </IconButton>
    </Tooltip>
  );
}

