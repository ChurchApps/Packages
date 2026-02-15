"use client";

import React from "react";
import { Avatar, SxProps } from "@mui/material";
import { PersonInterface } from "@churchapps/helpers";
import { PersonHelper } from "../helpers";

interface Props {
  person: PersonInterface;
  size?: "small" | "medium" | "large" | "xlarge" | "xxlarge" | "responsive";
  sx?: SxProps;
  onClick?: () => void;
}

export const PersonAvatar: React.FC<Props> = ({ person, size = "medium", sx, onClick }) => {
  const [imageError, setImageError] = React.useState(false);

  const getSizeProps = () => {
    switch (size) {
      case "small": return { width: 48, height: 48 };
      case "medium": return { width: 56, height: 56 };
      case "large": return { width: 80, height: 80 };
      case "xlarge": return { width: 100, height: 100 };
      case "xxlarge": return { width: 120, height: 120 };
      case "responsive": return { width: { xs: 70, sm: 80, md: 100 }, height: { xs: 70, sm: 80, md: 100 } };
      default: return { width: 56, height: 56 };
    }
  };

  const getInitials = () => {
    if (!person?.name?.display) return "?";

    const names = person.name.display.trim().split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else if (names.length === 1) {
      return names[0][0]?.toUpperCase() || "?";
    }
    return "?";
  };

  const photoUrl = PersonHelper.getPhotoUrl(person);
  const sizeProps = getSizeProps();

  // Combine default styles with custom sx
  const combinedSx = {
    ...sizeProps,
    cursor: onClick ? "pointer" : "default",
    "&:hover": onClick ? {
      opacity: 0.8,
      transition: "opacity 0.2s ease-in-out"
    } : {},
    ...sx
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Avatar
      src={!imageError ? photoUrl : undefined}
      alt={person?.name?.display || "User avatar"}
      sx={combinedSx}
      onClick={onClick}
      onError={handleImageError}
    >
      {(imageError || !photoUrl) && getInitials()}
    </Avatar>
  );
};
