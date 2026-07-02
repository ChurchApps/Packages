"use client";

import React from "react";
import { Icon } from "@mui/material";
import { ElementInterface } from "../../helpers";

interface Props {
  element: ElementInterface;
}

const SIZES: Record<string, number> = { small: 32, medium: 48, large: 72 };

export const IconFeatureElement = ({ element }: Props) => {
  const align = (element.answers?.textAlignment as "left" | "center" | "right") || "center";
  const iconSize = SIZES[element.answers?.iconSize as string] || SIZES.medium;
  const iconColor = element.answers?.iconColor || "#03a9f4";
  const icon = element.answers?.icon || "star";
  return (
    <div id={"el-" + element.id} className="iconFeature" style={{ textAlign: align }}>
      <Icon sx={{ fontSize: iconSize, color: iconColor, width: "auto", height: "auto" }}>{icon}</Icon>
      {element.answers?.title && <h3 style={{ marginBottom: 8 }}>{element.answers.title}</h3>}
      <div dangerouslySetInnerHTML={{ __html: element.answers?.description || "" }} />
    </div>
  );
};
