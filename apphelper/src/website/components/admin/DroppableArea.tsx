"use client";

import { Icon } from "@mui/material";
import React, { CSSProperties, useEffect, useState } from "react";
import { useDrop } from "react-dnd";

type Props = {
  children?: React.ReactNode,
  accept: any,
  text?: string
  onDrop: (data: any) => void,
  dndDeps?: any,
  updateIsDragging?: (isDragging: boolean) => void
  hideWhenInactive?: boolean
};

const FLOW_HEIGHT = 20; // fixed flow size, never changes (no layout shift)
const HIT_OVERSHOOT = 16; // how far the visible/hit pill extends beyond the gap during drag

const WRAPPER_IDLE: CSSProperties = {
  position: "relative",
  width: "100%",
  height: `${FLOW_HEIGHT}px`,
  pointerEvents: "none",
  boxSizing: "border-box"
};

const WRAPPER_ACTIVE: CSSProperties = {
  ...WRAPPER_IDLE,
  pointerEvents: "auto"
};

const PILL_BASE: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  borderRadius: "8px",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  boxSizing: "border-box",
  transition: "all 0.15s ease-out",
  zIndex: 5
};

const PILL_HIDDEN: CSSProperties = {
  ...PILL_BASE,
  top: 0,
  bottom: 0,
  display: "none"
};

const PILL_VISIBLE: CSSProperties = {
  ...PILL_BASE,
  top: -HIT_OVERSHOOT,
  bottom: -HIT_OVERSHOOT,
  display: "flex"
};

type Variant = "justDropped" | "isOver" | "active";

const VARIANT_STYLES: Record<Variant, CSSProperties> = {
  justDropped: {
    border: "2px solid rgba(76, 175, 80, 1)",
    backgroundColor: "rgba(76, 175, 80, 0.95)",
    boxShadow: "0 4px 16px rgba(76, 175, 80, 0.5)"
  },
  isOver: {
    border: "2px solid rgba(25, 118, 210, 1)",
    backgroundColor: "rgba(25, 118, 210, 0.95)",
    boxShadow: "0 4px 20px rgba(25, 118, 210, 0.55)"
  },
  active: {
    border: "2px dashed rgba(25, 118, 210, 0.9)",
    backgroundColor: "rgba(25, 118, 210, 0.55)"
  }
};

const LEGACY_HIDDEN: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "4px",
  zIndex: 1,
  border: "none",
  backgroundColor: "transparent"
};

const LEGACY_ACTIVE_BASE: CSSProperties = {
  width: "100%",
  height: `${FLOW_HEIGHT}px`,
  padding: "0 10px",
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  boxSizing: "border-box",
  transition: "all 0.15s ease-out"
};

function getVariant(justDropped: boolean, isOver: boolean, canDrop: boolean): Variant | null {
  if (justDropped) return "justDropped";
  if (isOver) return "isOver";
  if (canDrop) return "active";
  return null;
}

export function DroppableArea(props: Props) {
  const { accept, onDrop, text, updateIsDragging, dndDeps, hideWhenInactive = true } = props;
  const [justDropped, setJustDropped] = useState(false);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept,
      drop: (data) => {
        onDrop(data);
        setJustDropped(true);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop()
      })
    }),
    [dndDeps, onDrop]
  );

  useEffect(() => {
    if (updateIsDragging) updateIsDragging(canDrop);
  }, [canDrop, updateIsDragging]);

  useEffect(() => {
    if (!justDropped) return;
    const t = setTimeout(() => setJustDropped(false), 600);
    return () => clearTimeout(t);
  }, [justDropped]);

  const displayText = text || "Drop here to add";
  const variant = getVariant(justDropped, isOver, canDrop);

  if (!hideWhenInactive) {
    const legacyStyle = variant
      ? { ...LEGACY_ACTIVE_BASE, ...VARIANT_STYLES[variant] }
      : LEGACY_HIDDEN;

    return (
      <div
        ref={drop as any}
        style={legacyStyle}
        data-testid="droppable-area"
        aria-label={canDrop ? `Drop zone: ${displayText}` : ""}
        role={canDrop ? "region" : undefined}
      >
        {canDrop && <PillContents isOver={isOver} displayText={displayText} />}
      </div>
    );
  }

  const pillStyle = variant
    ? { ...PILL_VISIBLE, ...VARIANT_STYLES[variant] }
    : PILL_HIDDEN;

  return (
    <div style={canDrop ? WRAPPER_ACTIVE : WRAPPER_IDLE}>
      <div
        ref={drop as any}
        style={pillStyle}
        data-testid="droppable-area"
        aria-label={canDrop ? `Drop zone: ${displayText}` : ""}
        role={canDrop ? "region" : undefined}
      >
        {canDrop && <PillContents isOver={isOver} displayText={displayText} />}
      </div>
    </div>
  );
}

const PILL_CONTENTS_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  color: "#fff",
  fontSize: "0.85rem",
  fontWeight: 600,
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)"
};

const ICON_BASE_STYLE: CSSProperties = {
  fontSize: "1.25rem",
  transition: "transform 0.2s ease"
};

const ICON_SCALED_STYLE: CSSProperties = {
  ...ICON_BASE_STYLE,
  transform: "scale(1.15)"
};

function PillContents({ isOver, displayText }: { isOver: boolean; displayText: string }) {
  return (
    <div style={PILL_CONTENTS_STYLE}>
      <Icon style={isOver ? ICON_SCALED_STYLE : ICON_BASE_STYLE}>
        {isOver ? "add_circle" : "add_circle_outline"}
      </Icon>
      <span>{displayText}</span>
    </div>
  );
}
