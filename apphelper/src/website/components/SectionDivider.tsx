"use client";

import React from "react";

export type DividerShape = "wave" | "waves" | "slant" | "curve" | "triangle" | "peaks";

export interface SectionDividerProps {
  shape: DividerShape;
  position: "top" | "bottom";
  color: string;
  height?: number;
  flip?: boolean;
}

export type SectionDividerConfig = Omit<SectionDividerProps, "position">;

// Paths fill the lower portion of a 1440x100 viewBox (shaped edge on top). A "top" divider
// flips vertically so the shaped edge points down into the section; "flip" mirrors horizontally.
const SHAPE_PATHS: Record<DividerShape, string> = {
  wave: "M0,40 C480,120 960,-40 1440,40 L1440,100 L0,100 Z",
  waves: "M0,60 C160,100 320,20 480,60 C640,100 800,20 960,60 C1120,100 1280,20 1440,60 L1440,100 L0,100 Z",
  slant: "M0,100 L1440,0 L1440,100 Z",
  curve: "M0,100 C480,0 960,0 1440,100 Z",
  triangle: "M0,100 L720,20 L1440,100 Z",
  peaks: "M0,100 L240,30 L480,100 L720,30 L960,100 L1200,30 L1440,100 Z"
};

export const parseDividerConfig = (config: any): SectionDividerConfig | null => {
  if (!config || typeof config !== "object" || !config.shape || !SHAPE_PATHS[config.shape as DividerShape]) return null;
  const height = config.height != null && config.height !== "" ? Number(config.height) : undefined;
  return {
    shape: config.shape as DividerShape,
    color: config.color || "#ffffff",
    ...(height != null && !isNaN(height) ? { height } : {}),
    flip: config.flip === true || config.flip === "true"
  };
};

export const SectionDivider: React.FC<SectionDividerProps> = ({ shape, position, color, height = 60, flip = false }) => {
  const path = SHAPE_PATHS[shape];
  if (!path) return null;
  const scale = [position === "top" ? "scaleY(-1)" : "", flip ? "scaleX(-1)" : ""].filter(Boolean).join(" ");
  return (
    <div className="sectionDivider" style={{ [position]: 0, height }} aria-hidden="true">
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none" style={scale ? { transform: scale, transformOrigin: "center" } : undefined}>
        <path d={path} fill={color} />
      </svg>
    </div>
  );
};
