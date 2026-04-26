import React, { Suspense, lazy } from "react";
import { CircularProgress } from "@mui/material";

const HtmlEditorInner = lazy(() => import("./HtmlEditorInner"));

interface Props {
  value?: string;
  onChange?: (html: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
  readOnly?: boolean;
}

export function HtmlEditor({ value = "", onChange, style, placeholder, readOnly = false }: Props) {
  return (
    <Suspense fallback={<CircularProgress size={20} />}>
      <HtmlEditorInner
        value={value}
        onChange={onChange}
        style={style}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </Suspense>
  );
}
