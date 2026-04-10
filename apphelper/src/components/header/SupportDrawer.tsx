"use client";
import React, { useEffect, useState } from "react";
import { Avatar, Box, Button, Drawer, Icon, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { ApiHelper, UserHelper } from "../../helpers";

type Props = {
  appName: string;
  relatedArticles?: string[];
};

export const SupportDrawer = (props: Props) => {
  const [open, setOpen] = useState<boolean>(false);
  const [supportContact, setSupportContact] = useState<string>(null);
  const [churchLogo, setChurchLogo] = useState<string>(null);
  const supportHref = "https://support.churchapps.org/";

  let currentAppName = "";
  currentAppName = props.appName.toLowerCase();
  if (currentAppName === "b1admin") currentAppName = "b1Admin";

  const validateEmail = (email: string) => {
    return email.match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
  };

  const getLabelFromPath = (path: string) => {
    if (!path) return "";
    const [pathOnly, hash] = path.split("#");
    if (hash) return hash.replace(/-/g, " ");
    const cleaned = pathOnly.replace(/\/+$/, "");
    const parts = cleaned.split("/");
    const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || "";
    return lastPart.replace(/-/g, " ");
  };

  const handleChurchSupportClick = () => {
    if (validateEmail(supportContact)) {
      window.location.href = `mailto:${supportContact}`;
    } else {
      window.open(`http://${supportContact}`, "_blank").focus();
    }
  };

  const loadData = () => {
    if (UserHelper?.currentUserChurch?.church?.id) {
      ApiHelper.get("/settings/public/" + UserHelper.currentUserChurch.church.id, "MembershipApi").then((data: any) => {
        const contactRes = data?.supportContact;
        if (contactRes && contactRes !== "") setSupportContact(contactRes);

        const logoRes = data?.favicon_16x16;
        if (logoRes && logoRes !== "") setChurchLogo(logoRes);
      });
    }
  };

  useEffect(loadData, []);

  return (
    <>
      <IconButton sx={{ color: "white !important", borderRadius: 2 }} onClick={() => setOpen(true)} aria-label="Open support help" data-testid="support-help-button">
        <Icon sx={{ fontSize: "26px !important" }}>help</Icon>
      </IconButton>
      <Drawer open={open} onClose={() => setOpen(false)} anchor="right" PaperProps={{ sx: { width: { xs: "80%", sm: "40%", md: "30%", lg: "20%" } } }}>
        <Box
          sx={{ paddingTop: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "98vh" }}>
          <Box>
            {supportContact ? (
              <Box sx={{ display: "flex", justifyContent: "end", alignItems: "center" }}>
                <Box sx={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", marginRight: 2, borderRadius: 2, padding: "7px", backgroundColor: "#e9e9e9" }} component="div" onClick={() => handleChurchSupportClick()}>
                  <Avatar variant="rounded" src={churchLogo ? churchLogo : null} sx={{ marginRight: 1, bgcolor: "#568bda", width: 25, height: 25 }}>
                    <Icon fontSize="small">church</Icon>
                  </Avatar>
                  <Typography sx={{ color: "#568bda", fontSize: "13px" }}>Support</Typography>
                </Box>
              </Box>
            ) : null}
            <List>
              <ListItem disablePadding>
                <ListItemButton href={supportHref + currentAppName} target="_blank" rel="noopener noreferrer">
                  <ListItemIcon sx={{ minWidth: "38px" }}><Icon sx={{ color: "#568bda" }}>article</Icon></ListItemIcon>
                  <ListItemText sx={{ color: "#568bda" }}>View Documentation</ListItemText>
                </ListItemButton>
              </ListItem>
            </List>
            {props?.relatedArticles?.length > 0 ? (
              <Box sx={{ marginTop: 2 }}>
                <Typography sx={{ color: "#568bda", textDecoration: "underline", textUnderlineOffset: 10, textDecorationThickness: 2, marginLeft: 2 }}>Features Tour</Typography>
                <List sx={{ marginTop: 1.5 }}>
                  {props.relatedArticles.map((a) => {
                    const result = getLabelFromPath(a);
                    return (
                      <ListItem disablePadding>
                        <ListItemButton href={supportHref + a} target="_blank" rel="noopener noreferrer">
                          <ListItemIcon sx={{ minWidth: "35px" }}><Icon sx={{ color: "#568bda" }}>play_circle</Icon></ListItemIcon>
                          <ListItemText><Typography sx={{ color: "#568bda", textTransform: "capitalize" }} fontSize="15px">{result}</Typography></ListItemText>
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            ) : null}
          </Box>
          <Box sx={{ marginRight: 4, marginLeft: 4, marginTop: "auto" }}>
            <hr style={{ color: "#568bda", borderColor: "#568bda", marginLeft: -13, marginRight: -13 }} />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#568bda", marginBottom: 1.5, marginTop: 1.5 }}>
              <Avatar src="https://avatars.githubusercontent.com/u/74469593?s=200&v=4" variant="rounded" sx={{ width: 25, height: 25, marginRight: 1 }}>C</Avatar>
              <Typography>ChurchApps</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, marginBottom: 1 }}>
              <Button variant="contained" size="small" startIcon={<Icon fontSize="small">mail</Icon>} fullWidth sx={{ backgroundColor: "#568bda" }} href="mailto:support@churchapps.org">Support</Button>
              <Button variant="contained" size="small" startIcon={<Icon fontSize="small">forum</Icon>} fullWidth sx={{ backgroundColor: "#568bda" }} href="https://github.com/orgs/ChurchApps/discussions" target="_blank" rel="noopener noreferrer">Forum</Button>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};
