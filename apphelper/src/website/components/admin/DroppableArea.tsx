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

export function DroppableArea(props: Props) {
  const { accept, onDrop, text, updateIsDragging, dndDeps, hideWhenInactive = true } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [justDropped, setJustDropped] = useState(false);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept,
      drop: (data) => {
        onDrop(data);
        setJustDropped(true);
        setTimeout(() => setJustDropped(false), 600);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop()
      })
    }),
    [dndDeps, onDrop]
  );

  // Update dragging state via effect to avoid state updates during render
  useEffect(() => {
    setIsDragging(canDrop);
  }, [canDrop]);

  useEffect(() => {
    if (updateIsDragging) updateIsDragging(isDragging);
  }, [isDragging, updateIsDragging]);

  // Enhanced droppable zone styling
  // IMPORTANT: Keep height consistent between active/inactive to prevent layout shifts.
  // Layout shifts would push draggable elements out from under the mouse, breaking drag.
  const getDroppableStyle = (): CSSProperties => {
    const fixedHeight = "20px"; // Consistent height for spacing

    // When nothing is being dragged - invisible spacer
    if (hideWhenInactive && !canDrop) {
      return {
        width: "100%",
        height: fixedHeight,
        border: "none",
        backgroundColor: "transparent",
        pointerEvents: "none",
        boxSizing: "border-box"
      };
    }

    // Legacy behavior (when hideWhenInactive is false) - absolute positioning
    if (!hideWhenInactive && !canDrop) {
      return {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "4px",
        zIndex: 1,
        border: "none",
        backgroundColor: "transparent"
      };
    }

    // When dragging - same height, just show the styling
    const baseStyle: CSSProperties = {
      width: "100%",
      height: fixedHeight,
      padding: "0 10px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxSizing: "border-box",
      transition: "all 0.15s ease-out"
    };

    if (justDropped) {
      return {
        ...baseStyle,
        border: "2px solid rgba(76, 175, 80, 1)",
        backgroundColor: "rgba(76, 175, 80, 1)",
        boxShadow: "0 4px 12px rgba(76, 175, 80, 0.6)"
      };
    }

    if (isOver) {
      return {
        ...baseStyle,
        border: "3px solid rgba(25, 118, 210, 1)",
        backgroundColor: "rgba(25, 118, 210, 1)",
        boxShadow: "0 0 20px rgba(25, 118, 210, 0.9), 0 0 40px rgba(25, 118, 210, 0.5)",
        transform: "scaleY(1.3)",
        transition: "all 0.15s ease-out"
      };
    }

    return {
      ...baseStyle,
      border: "2px dashed rgba(25, 118, 210, 1)",
      backgroundColor: "rgba(25, 118, 210, 0.7)"
    };
  };

  // Display text based on state
  const displayText = text || "Drop here to add";

  return (
    <div
      ref={drop as any}
      style={getDroppableStyle()}
      data-testid="droppable-area"
      aria-label={canDrop ? `Drop zone: ${displayText}` : ""}
      role={canDrop ? "region" : undefined}
    >
      {canDrop && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          color: "#fff",
          fontSize: "0.75rem",
          fontWeight: 600
        }}>
          <Icon style={{
            fontSize: "1rem",
            transition: "transform 0.2s ease",
            transform: isOver ? "scale(1.1)" : "scale(1)"
          }}>
            {isOver ? "add_circle" : "add_circle_outline"}
          </Icon>
          <span>{displayText}</span>
        </div>
      )}
    </div>
  );
}
