"use client";

import React from "react";
import { lazy, Suspense } from "react";
import { Loading } from "@churchapps/apphelper";
const Editor = lazy(() => import("./Editor"));

interface Props {
  value: string;
  onChange?: (newValue: string) => void;
  style?: any;
  textAlign?: "left" | "center" | "right";
  placeholder?: string;
}

export function MarkdownEditor({ value: markdownString = "", onChange, style, textAlign, placeholder }: Props) {
  return <div id="markdown-editor-wrapper"><Suspense fallback={<Loading />}><Editor value={markdownString} onChange={onChange} style={style} textAlign={textAlign} placeholder={placeholder} /></Suspense></div>;
}
