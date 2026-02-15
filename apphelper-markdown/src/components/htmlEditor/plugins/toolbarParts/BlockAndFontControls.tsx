import React, { useState } from "react";
import { Box, IconButton, MenuItem, Popover, Select, Tooltip } from "@mui/material";
import { FormatSize } from "@mui/icons-material";

interface Props {
  blockType: string;
  onFormatHeading: (tag: "h1"|"h2"|"h3"|"h4"|"h5"|"h6") => void;
  onFormatParagraph: () => void;
  onFormatCode: () => void;
  onApplyFontSize: (size: string) => void;
}

const FONT_SIZES = [
  "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"
];

export function BlockAndFontControls({ blockType, onFormatHeading, onFormatParagraph, onFormatCode, onApplyFontSize }: Props) {
  const [fontSizeAnchor, setFontSizeAnchor] = useState<null | HTMLElement>(null);

  // Normalize block type to a valid dropdown value
  // When in lists (bullet/number) or quotes, show "Normal" as the base block type
  const validBlockTypes = [
    "paragraph", "h1", "h2", "h3", "h4", "h5", "h6", "code"
  ];
  const normalizedBlockType = validBlockTypes.includes(blockType) ? blockType : "paragraph";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Select
        value={normalizedBlockType}
        size="small"
        sx={{ minWidth: 100 }}
        onChange={(e) => {
          const value = e.target.value as string;
          if (value === "paragraph") return onFormatParagraph();
          if (value === "code") return onFormatCode();
          if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(value)) return onFormatHeading(value as any);
        }}
      >
        <MenuItem value="paragraph">Normal</MenuItem>
        <MenuItem value="h1">Heading 1</MenuItem>
        <MenuItem value="h2">Heading 2</MenuItem>
        <MenuItem value="h3">Heading 3</MenuItem>
        <MenuItem value="h4">Heading 4</MenuItem>
        <MenuItem value="h5">Heading 5</MenuItem>
        <MenuItem value="h6">Heading 6</MenuItem>
        <MenuItem value="code">Code Block</MenuItem>
      </Select>

      <Tooltip title="Font Size">
        <IconButton onClick={(e) => setFontSizeAnchor(e.currentTarget)} size="small">
          <FormatSize />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(fontSizeAnchor)}
        anchorEl={fontSizeAnchor}
        onClose={() => setFontSizeAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
      >
        <Box sx={{ p: 1 }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {FONT_SIZES.map(size => (
            <MenuItem key={size} onClick={() => { onApplyFontSize(size); setFontSizeAnchor(null); }}>
              {size}
            </MenuItem>
          ))}
        </Box>
      </Popover>
    </Box>
  );
}

