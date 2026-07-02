"use client";

import React from "react";
import { SvgIcon } from "@mui/material";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import XIcon from "@mui/icons-material/X";
import { ElementInterface, SectionInterface } from "../../helpers";

interface Props {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

const TikTokIcon = () => (
  <SvgIcon viewBox="0 0 24 24"><path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48" /></SvgIcon>
);

const VimeoIcon = () => (
  <SvgIcon viewBox="0 0 24 24"><path d="M22 7.42c-.1 2.14-1.59 5.06-4.48 8.78C14.54 20.08 12 22 9.89 22c-1.31 0-2.42-1.21-3.32-3.63c-.6-2.21-1.2-4.42-1.8-6.63c-.67-2.42-1.38-3.63-2.15-3.63c-.17 0-.75.35-1.74 1.04L0 7.83c1.05-.92 2.08-1.85 3.1-2.77C4.5 3.85 5.55 3.22 6.26 3.15c1.67-.16 2.7.98 3.08 3.42c.42 2.63.71 4.27.87 4.91c.49 2.22 1.03 3.33 1.62 3.33c.46 0 1.15-.72 2.07-2.17c.92-1.45 1.41-2.55 1.48-3.31c.13-1.24-.36-1.86-1.48-1.86c-.53 0-1.07.12-1.63.36c1.08-3.54 3.15-5.26 6.2-5.16c2.26.06 3.32 1.53 3.19 4.4" /></SvgIcon>
);

const SIZES: Record<string, number> = { small: 32, medium: 44, large: 56 };
const ICON_SCALE = 0.55;

export const SocialIconsElement = ({ element, onEdit }: Props) => {
  const answers = element.answers || {};
  const networks: { key: string; url: string; label: string; icon: React.ReactNode }[] = [
    { key: "facebook", url: answers.facebook, label: "Facebook", icon: <FacebookIcon /> },
    { key: "instagram", url: answers.instagram, label: "Instagram", icon: <InstagramIcon /> },
    { key: "youtube", url: answers.youtube, label: "YouTube", icon: <YouTubeIcon /> },
    { key: "x", url: answers.x, label: "X", icon: <XIcon /> },
    { key: "tiktok", url: answers.tiktok, label: "TikTok", icon: <TikTokIcon /> },
    { key: "vimeo", url: answers.vimeo, label: "Vimeo", icon: <VimeoIcon /> }
  ].filter((n) => n.url);

  if (networks.length === 0) {
    if (onEdit) return <div className="social-icons-empty">Social Icons: add at least one profile URL</div>;
    return null;
  }

  const outlined = answers.iconStyle === "outlined";
  const color = answers.color || "#444444";
  const size = SIZES[answers.size as string] || SIZES.medium;
  const align = (answers.alignment as string) || "center";
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  const circleStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: outlined ? color : "#fff",
    background: outlined ? "transparent" : color,
    border: outlined ? `2px solid ${color}` : "none",
    textDecoration: "none"
  };

  return (
    <div id={"el-" + element.id} className="social-icons" style={{ display: "flex", gap: 12, justifyContent: justify, flexWrap: "wrap" }}>
      {networks.map((n) => (
        <a key={n.key} href={n.url} target="_blank" rel="noopener noreferrer" aria-label={n.label} style={circleStyle}>
          <span style={{ display: "inline-flex", fontSize: size * ICON_SCALE, lineHeight: 0 }}>
            {React.isValidElement(n.icon) ? React.cloneElement(n.icon as React.ReactElement<{ style?: React.CSSProperties }>, { style: { fontSize: size * ICON_SCALE } }) : n.icon}
          </span>
        </a>
      ))}
    </div>
  );
};
