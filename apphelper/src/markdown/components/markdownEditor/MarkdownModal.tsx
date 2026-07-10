"use client";

import React, { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from "@mui/material";
import { MarkdownPreview } from "./MarkdownPreview";
import { Locale } from "../../..";

interface Props {
  hideModal: () => void
  onChange: (newValue: string) => void
  value?: string;
}

const guideLink = <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noopener noreferrer" style={{ float: "right" }}>{Locale.label("markdownEditor.markdownGuide")}</a>;


export const MarkdownModal: React.FC<Props> = ({ value, onChange, hideModal }) => {
  const [inputVal, setInputVal] = useState(value || "");


  useEffect(() => {
    if ((value || "").trim() === inputVal.trim()) return;
    setInputVal(value || "");
  }, [value, inputVal]);

  useEffect(() => { onChange(inputVal); }, [inputVal, onChange]);

  return (<Dialog open={true} onClose={() => { hideModal(); }} fullScreen={true}>
    <DialogTitle>{Locale.label("markdownEditor.markdownGuide")}</DialogTitle>
    <DialogContent>
      <Grid container spacing={3}>
        <Grid size={6}>
          <TextField fullWidth multiline label={<>{Locale.label("markdownEditor.content")} &nbsp; {guideLink}</>} name="modalMarkdown" className="modalMarkdown" InputProps={{ style: { height: "80vh" } }} value={inputVal} onChange={(e) => {
            setInputVal(e.target.value);
          }} placeholder="" />
        </Grid>
        <Grid size={6}>
          <div style={{ border: "1px solid #BBB", borderRadius: 5, marginTop: 15, padding: 10, height: "80vh", overflowY: "scroll" }} id="markdownPreview">
            <div style={{ marginTop: -20, marginBottom: -10, position: "absolute" }}><span style={{ backgroundColor: "#FFFFFF", color: "#999", fontSize: 13 }}> &nbsp; Preview &nbsp; </span></div>
            <MarkdownPreview value={inputVal} />
          </div>
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions sx={{ paddingX: "16px", paddingBottom: "12px" }}>
      <Button variant="outlined" onClick={() => { hideModal(); }}>{Locale.label("common.close")}</Button>
    </DialogActions>
  </Dialog>);
};
