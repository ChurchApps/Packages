"use client";
import React, { useState, useRef } from "react";
import { Box, Button, Icon, Paper, Popper, Grow, ClickAwayListener } from "@mui/material";
import { NavItem } from "../wrapper/NavItem";

interface Props {
  label: string;
  menuItems: { url: string; icon: string; label: string }[];
  onNavigate: (url: string) => void;
}

export const PrimaryMenu = (props: Props) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }
    setOpen(false);
  };

  const handleItemClick = (url: string) => {
    setOpen(false);
    props.onNavigate(url);
  };

  const getNavItems = () => {
    const result: React.ReactElement[] = [];
    props.menuItems.forEach((item) => {
      result.push(
        <NavItem
          url={item.url}
          label={item.label.toUpperCase()}
          icon={item.icon}
          key={item.url}
          onNavigate={handleItemClick}
        />
      );
    });
    return result;
  };

  return (
    <>
      <Button
        ref={anchorRef}
        onClick={handleToggle}
        color="inherit"
        endIcon={<Icon>expand_more</Icon>}
        id="primaryNavButton"
      >
        <img src="/images/logo-icon.png" alt="Primary Menu" />
        <h2>{props.label}</h2>
      </Button>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        placement="bottom-end"
        transition
        disablePortal={true}
        style={{ zIndex: 1300, color: "#FFF" }}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper
              elevation={3}
              sx={{
                backgroundColor: "var(--c1)",
                color: "#FFF",
                minWidth: 300,
                paddingY: "10px",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))"
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <Box
                  sx={{
                    "& a": { color: "#FFF", textDecoration: "none" },
                    "& a:hover": { color: "#DDD" }
                  }}
                >
                  {getNavItems()}
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};
