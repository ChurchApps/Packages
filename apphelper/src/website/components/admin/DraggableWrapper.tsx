"use client";

import React from "react";
import { useDrag } from "react-dnd";

type Props = {
  children?: React.ReactNode;
  dndType: string;
  elementType?: string;
  data: any;
  onDoubleClick?: (e: React.MouseEvent) => void;
};

export function DraggableWrapper(props: Props) {
  // Simplified useDrag - matching the pattern from DragV2 that works
  const [, drag] = useDrag(() => ({
    type: props.dndType,
    item: { elementType: props.elementType, data: props.data }
  }), [props.dndType, props.elementType, props.data]);

  const showCursor = props.dndType === "section" || props.dndType === "element";

  return (
    <div
      ref={drag as any}
      className={showCursor ? undefined : "dragButton"}
      onDoubleClick={props.onDoubleClick}
      style={{ position: "relative", cursor: showCursor ? "grab" : undefined }}
    >
      {props.children}
    </div>
  );
}
