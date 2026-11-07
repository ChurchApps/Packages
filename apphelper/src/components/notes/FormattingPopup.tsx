"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon, IconButton, Paper, Popper } from "@mui/material";
import { Locale } from "../../helpers";
import { applyFormat, FormatKind } from "./formatSelection";

type TextareaRef = React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;

const BUTTONS: { kind: FormatKind; icon: string; key: string; fallback: string }[] = [
  { kind: "bold", icon: "format_bold", key: "notes.formatBold", fallback: "Bold" },
  { kind: "italic", icon: "format_italic", key: "notes.formatItalic", fallback: "Italic" },
  { kind: "bullets", icon: "format_list_bulleted", key: "notes.formatBullets", fallback: "Bulleted list" },
  { kind: "numbered", icon: "format_list_numbered", key: "notes.formatNumbered", fallback: "Numbered list" }
];

function useApplyFormat(textareaRef: TextareaRef, value: string, onChange: (value: string) => void) {
  return useCallback((kind: FormatKind) => {
    const el = textareaRef.current;
    if (!el) return;
    const result = applyFormat(value || "", el.selectionStart ?? 0, el.selectionEnd ?? 0, kind);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  }, [textareaRef, value, onChange]);
}

interface Props {
  textareaRef: TextareaRef;
  value: string;
  onChange: (value: string) => void;
}

// Bold / Italic / Bullets / Numbered popup shown over highlighted text in a plain text box.
export function FormattingPopup({ textareaRef, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const format = useApplyFormat(textareaRef, value, onChange);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const update = () => setOpen(document.activeElement === el && (el.selectionStart ?? 0) !== (el.selectionEnd ?? 0));
    const close = () => setOpen(false);
    const events = ["select", "keyup", "mouseup", "focus"];
    events.forEach((e) => el.addEventListener(e, update));
    el.addEventListener("blur", close);
    return () => {
      events.forEach((e) => el.removeEventListener(e, update));
      el.removeEventListener("blur", close);
    };
  }, [textareaRef]);

  const anchor = textareaRef.current;
  return (
    <Popper open={open && !!anchor} anchorEl={anchor} placement="top-start" sx={{ zIndex: (theme) => theme.zIndex.tooltip }}>
      <Paper elevation={4} sx={{ display: "flex", p: 0.25, mb: 0.5 }} data-testid="formatting-popup">
        {BUTTONS.map((b) => (
          <IconButton
            key={b.kind}
            size="small"
            aria-label={Locale.label(b.key, b.fallback)}
            title={Locale.label(b.key, b.fallback)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format(b.kind)}
          >
            <Icon fontSize="small">{b.icon}</Icon>
          </IconButton>
        ))}
      </Paper>
    </Popper>
  );
}

// Ctrl/Cmd+B and Ctrl/Cmd+I for a plain text box, plus the highlight popup.
export function useFormattingShortcuts(textareaRef: TextareaRef, value: string, onChange: (value: string) => void) {
  const format = useApplyFormat(textareaRef, value, onChange);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const key = e.key.toLowerCase();
    if (key !== "b" && key !== "i") return;
    e.preventDefault();
    format(key === "b" ? "bold" : "italic");
  }, [format]);

  const popup = <FormattingPopup textareaRef={textareaRef} value={value} onChange={onChange} />;
  return { onKeyDown, popup };
}
