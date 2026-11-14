"use client";

import React, { useEffect, useState } from "react";

export interface AnnouncementConfig {
  text: string;
  linkUrl?: string;
  linkText?: string;
  backgroundColor?: string;
  textColor?: string;
  startDate?: string;
  endDate?: string;
}

export interface AnnouncementBannerProps {
  config: AnnouncementConfig;
  onDismiss?: () => void;
}

export const parseAnnouncementConfig = (json: string | null): AnnouncementConfig | null => {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || typeof parsed.text !== "string" || !parsed.text) return null;
    return parsed as AnnouncementConfig;
  } catch {
    return null;
  }
};

const dismissKey = (text: string) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = (h << 5) - h + text.charCodeAt(i); h |= 0; }
  return "announcement-dismissed-" + Math.abs(h).toString(36);
};

const withinWindow = (start?: string, end?: string) => {
  const now = Date.now();
  if (start) { const s = new Date(start).getTime(); if (!isNaN(s) && now < s) return false; }
  if (end) { const e = new Date(end).getTime(); if (!isNaN(e) && now > e) return false; }
  return true;
};

// A dismissal hides the bar for a day; a changed announcement has a new key and shows at once.
const DISMISS_MS = 24 * 60 * 60 * 1000;

const isDismissed = (key: string) => {
  try {
    const until = Number(window.localStorage.getItem(key));
    if (until > Date.now()) return true;
    if (until) window.localStorage.removeItem(key);
  } catch { /* localStorage may be unavailable */ }
  return false;
};

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ config, onDismiss }) => {
  const storageKey = dismissKey(config?.text || "");
  const [dismissed, setDismissed] = useState(false);

  // Read storage after mount so the client's first render matches the server's.
  useEffect(() => { setDismissed(isDismissed(storageKey)); }, [storageKey]);

  if (!config?.text) return null;
  if (!withinWindow(config.startDate, config.endDate)) return null;
  if (dismissed) return null;

  const textColor = config.textColor || "#ffffff";
  const dismiss = () => {
    try { window.localStorage.setItem(storageKey, String(Date.now() + DISMISS_MS)); } catch { /* localStorage may be unavailable */ }
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="announcement-banner" role="region" aria-label="Announcement" style={{ backgroundColor: config.backgroundColor || "#1565c0", color: textColor }}>
      <span className="announcement-banner__text">{config.text}</span>
      {config.linkUrl && <a className="announcement-banner__link" href={config.linkUrl} style={{ color: textColor }}>{config.linkText || "Learn more"}</a>}
      <button type="button" className="announcement-banner__close" aria-label="Dismiss announcement" onClick={dismiss} style={{ color: textColor }}>&times;</button>
    </div>
  );
};
