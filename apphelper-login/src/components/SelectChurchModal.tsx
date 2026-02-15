"use client";

import React from "react";
import { ChurchInterface, LoginUserChurchInterface } from "@churchapps/helpers";
import { SelectChurchSearch } from "./SelectChurchSearch";
import { SelectableChurch } from "./SelectableChurch";
import { ErrorMessages } from "@churchapps/apphelper";
import { Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Box } from "@mui/material";
import { Logout } from "@mui/icons-material";
import { Locale } from "../helpers";

interface Props {
	appName: string,
	show: boolean,
	userChurches?: LoginUserChurchInterface[],
	selectChurch: (churchId: string) => void,
	registeredChurchCallback?: (church: ChurchInterface) => void,
	errors?: string[],
	handleRedirect?: (url: string) => void
}

export const SelectChurchModal: React.FC<Props> = (props) => {
  const [showSearch, setShowSearch] = React.useState(false);

  const handleClose = () => {
    window.location.reload();
  };

  const getContents = () => {
    if (showSearch || props.userChurches?.length === 0) return <SelectChurchSearch selectChurch={props.selectChurch} registeredChurchCallback={props.registeredChurchCallback} appName={props.appName} />;
    else {
      return (<>
			{props.userChurches?.map(uc => (<SelectableChurch church={uc.church} selectChurch={props.selectChurch} key={uc.church.id} />))}
			<Box sx={{ textAlign: "center", mt: 3 }}>
				<button
					type="button"
					style={{
					  display: "inline-block",
					  background: "none",
					  border: "none",
					  color: "#3b82f6",
					  cursor: "pointer",
					  textDecoration: "none",
					  fontSize: "1rem",
					  transition: "all 0.2s ease"
					}}
					onClick={(e) => { e.preventDefault(); setShowSearch(true); }}
					onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
					onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
				>
					{Locale.label("selectChurch.another")}
				</button>
			</Box>
		</>);
    }
  };

  return (
		<Dialog
			open={props.show}
			onClose={handleClose}
			aria-labelledby="select-church-title"
			aria-describedby="select-church-content"
		>
			<DialogTitle id="select-church-title" sx={{ fontSize: "1.5rem", fontWeight: 600 }}>
				{Locale.label("selectChurch.selectChurch")}
			</DialogTitle>
			<Tooltip title="Logout" arrow>
				<IconButton
					sx={{ position: "absolute", right: 8, top: 8 }}
					color="error"
					aria-label="Logout"
					onClick={() => {
					  // Use handleRedirect function if available, otherwise fallback to window.location
					  if (props.handleRedirect) {
					    props.handleRedirect("/logout");
					  } else {
					    window.location.href = "/logout";
					  }
					}}>
					<Logout />
				</IconButton>
			</Tooltip>
			<DialogContent id="select-church-content" sx={{ width: 700, maxWidth: "100%", px: 2, py: 2 }}>
				<ErrorMessages errors={props.errors} />
				{getContents()}
			</DialogContent>
		</Dialog>
  );
};
