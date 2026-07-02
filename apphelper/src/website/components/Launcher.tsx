"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@mui/material";

export interface LauncherAction { label: string; url: string; icon?: string; }

export interface LauncherConfig {
  actions: LauncherAction[];
  position?: "bottomRight" | "bottomLeft";
  color?: string;
}

export interface LauncherProps {
  config: LauncherConfig;
}

export const parseLauncherConfig = (json: string | null): LauncherConfig | null => {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const actions: LauncherAction[] = Array.isArray(parsed.actions)
      ? parsed.actions
        .filter((a: any) => a && typeof a.label === "string" && a.label && typeof a.url === "string" && a.url)
        .slice(0, 5)
        .map((a: any) => ({ label: a.label, url: a.url, ...(typeof a.icon === "string" && a.icon ? { icon: a.icon } : {}) }))
      : [];
    if (actions.length === 0) return null;
    return {
      actions,
      position: parsed.position === "bottomLeft" ? "bottomLeft" : "bottomRight",
      ...(typeof parsed.color === "string" && parsed.color ? { color: parsed.color } : {})
    };
  } catch {
    return null;
  }
};

export const Launcher: React.FC<LauncherProps> = ({ config }) => {
  const [open, setOpen] = useState(false);
  const actions = (config?.actions || []).slice(0, 5);
  const position = config?.position === "bottomLeft" ? "bottomLeft" : "bottomRight";
  const color = config?.color || "#1565c0";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div className={"launcher launcher--" + position} data-open={open}>
      <div className="launcher-actions" role="menu">
        {actions.map((a, i) => (
          <a
            key={i}
            role="menuitem"
            className="launcher-action"
            href={a.url}
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            style={{ transitionDelay: (open ? i : actions.length - 1 - i) * 40 + "ms" }}
          >
            {a.icon && <Icon className="launcher-action-icon" fontSize="small">{a.icon}</Icon>}
            <span className="launcher-action-label">{a.label}</span>
          </a>
        ))}
      </div>
      <button
        type="button"
        className="launcher-fab"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        style={{ backgroundColor: color }}
      >
        <Icon className="launcher-fab-icon">add</Icon>
      </button>
    </div>
  );
};
