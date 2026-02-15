"use client";

import React from "react";
import { Paper, Box, Typography, Icon } from "@mui/material";
import { HelpIcon } from "./HelpIcon";
import { SmallButton } from "./SmallButton";
import { styled, useTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    InputBox: { headerText: string; };
  }
  interface PaletteOptions {
    InputBox?: { headerText?: string; };
  }
}


interface Props {
  id?: string,
  children: React.ReactNode,
  headerIcon?: string,
  headerText: string,
  editFunction?: () => void,
  editContent?: React.ReactNode,
  "data-testid"?: string,
  ariaLabel?: string,
  footerContent?: React.ReactNode,
  help?: string
}

/* "& p": { color: "#666" }, */
const CustomContextBox = styled(Box)({
  marginTop: 10,
  overflowX: "hidden",
  "& label": { color: "#999" },
  "& ul": { paddingLeft: 0 },
  "& li": {
    listStyleType: "none",
    marginBottom: 10,
    "& i": { marginRight: 5 }
  },
  "& td": { "& i": { marginRight: 5 } },
  "& td:first-of-type": { paddingLeft: 0 },
  "& td:last-of-type": { paddingRight: 0 },
  "& th:first-of-type": { paddingLeft: 0 },
  "& th:last-of-type": { paddingRight: 0 }
});

export const DisplayBox = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const theme = useTheme();
  const headerText = theme?.palette?.InputBox?.headerText ? theme?.palette?.InputBox?.headerText : "primary";

  let editContent: React.ReactNode;
  if (props.editFunction !== undefined) {
    editContent = <SmallButton icon="edit" aria-label={props.ariaLabel || "editButton"} onClick={props.editFunction} />;
  } else if (props.editContent !== undefined) editContent = props.editContent;

  return (
    <Paper sx={{ padding: 2, marginBottom: 4 }} id={props.id || "display-box"} data-testid={props["data-testid"] || ""}>
      {props.help && <HelpIcon article={props.help} />}
      <Box id="display-box-header" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box id="display-box-title-section" sx={{ display: "flex", alignItems: "center" }}>
          {props.headerIcon && <Icon id="display-box-icon" sx={{ color: headerText }}>{props.headerIcon}</Icon>}
          <Typography id="display-box-title" component="h2" sx={{ display: "inline-block", marginLeft: props.headerIcon ? 1 : 0 }} variant="h6" color={headerText}>
            {props.headerText}
          </Typography>

        </Box>
        <Box id="display-box-actions">
          {editContent}
        </Box>
      </Box>
      <CustomContextBox id="display-box-content" ref={ref} data-testid="display-box-content">{props.children}</CustomContextBox>
      {props.footerContent && (<div id="display-box-footer" style={{ marginLeft: -16, marginRight: -16, marginBottom: -15, marginTop: 15 }}>{props.footerContent}</div>)}
    </Paper>
  );
});

DisplayBox.displayName = "DisplayBox";
