import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Tabs,
  Tab,
  TextField
} from "@mui/material";
import { Close, Visibility, Edit, Code } from "@mui/icons-material";
import { HtmlEditor } from "./HtmlEditor";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  value?: string;
  onChange?: (html: string) => void;
  onSave?: (html: string) => void;
  saveButtonText?: string;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
}

export function HtmlModal({
  open,
  onClose,
  title = "HTML Editor",
  value = "",
  onChange,
  onSave,
  saveButtonText = "Save",
  maxWidth = "lg",
  fullWidth = true
}: Props) {
  const [currentValue, setCurrentValue] = useState(value);
  const [htmlSourceValue, setHtmlSourceValue] = useState(value);
  const [activeTab, setActiveTab] = useState(0);

  // Sync currentValue with prop value when modal opens or value changes
  useEffect(() => {
    if (open) {
      setCurrentValue(value);
      setHtmlSourceValue(value);
    }
  }, [open, value]);

  const handleChange = (html: string) => {
    setCurrentValue(html);
    setHtmlSourceValue(html);
    if (onChange) {
      onChange(html);
    }
  };

  const handleHtmlSourceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newHtml = event.target.value;
    setHtmlSourceValue(newHtml);
    setCurrentValue(newHtml);
    if (onChange) {
      onChange(newHtml);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Sync HTML source when switching to HTML tab
    if (newValue === 2) {
      setHtmlSourceValue(currentValue);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(currentValue);
    }
    onClose();
  };

  const handleClose = () => {
    setCurrentValue(value);
    setHtmlSourceValue(value);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{ sx: { height: "80vh" } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        {title}
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab icon={<Edit />} label="Edit" />
          <Tab icon={<Visibility />} label="Preview" />
          <Tab icon={<Code />} label="HTML Source" />
        </Tabs>

        <Box sx={{ height: "calc(100% - 48px)", overflow: "hidden" }}>
          {activeTab === 0 ? (
            <HtmlEditor
              value={currentValue}
              onChange={handleChange}
              style={{ height: "100%", border: "none" }}
              placeholder="Start typing your HTML content..."
            />
          ) : activeTab === 1 ? (
            <Box
              sx={{ p: 2, height: "100%", overflow: "auto" }}
              dangerouslySetInnerHTML={{ __html: currentValue }}
            />
          ) : (
            <TextField
              multiline
              fullWidth
              value={htmlSourceValue}
              onChange={handleHtmlSourceChange}
              placeholder="Enter HTML code..."
              sx={{
                height: "100%",
                "& .MuiInputBase-root": {
                  height: "100%",
                  alignItems: "flex-start",
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  fontSize: "14px",
                  bgcolor: "#f5f5f5"
                },
                "& .MuiInputBase-input": {
                  height: "100% !important",
                  overflow: "auto !important",
                  padding: 2
                }
              }}
              InputProps={{
                sx: {
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  fontSize: "14px"
                }
              }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          {saveButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
