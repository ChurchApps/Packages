"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Icon, Stack } from "@mui/material";
import React from "react";
import { Locale } from "../helpers";

interface Props {
  appName?: string
  onClose: () => void
}

export const SupportModal: React.FC<Props> = ({ appName = "", onClose }) => {
  const subject = appName ? `?subject=${appName} Support` : "";

  return (<>
    <Dialog
      open={true}
      onClose={onClose}
      aria-labelledby="support-modal-title"
      aria-describedby="support-modal-content"
    >
      <DialogTitle id="support-modal-title">Get Support</DialogTitle>
      <DialogContent id="support-modal-content">
        <Stack direction="row" alignItems="center" sx={{ flexWrap: "wrap" }}><b><Stack direction="row" alignItems="center" mr="5px"><Icon sx={{ marginRight: "5px" }}>info</Icon> {Locale.label("support.documentation")}:</Stack></b> <a href="https://support.churchapps.org" target="_new">https://support.churchapps.org</a></Stack>
        <Stack direction="row" alignItems="center" sx={{ flexWrap: "wrap" }} mb={2}><b><Stack direction="row" alignItems="center" mr="5px"><Icon sx={{ marginRight: "5px" }}>forum</Icon> {Locale.label("support.discussions")}:</Stack></b> <a href="https://github.com/orgs/ChurchApps/discussions" target="_new">https://github.com/orgs/ChurchApps/discussions</a></Stack>
      </DialogContent>
      <DialogActions sx={{ paddingX: "16px", paddingBottom: "12px" }}>
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  </>);
};
