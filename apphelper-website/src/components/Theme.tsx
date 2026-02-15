import React from "react";
import type { GlobalStyleInterface } from "../helpers";

interface Props {
  globalStyles?: GlobalStyleInterface;
  appearance?: any;
}

export const Theme: React.FC<Props> = (props) => {
  const lines: string[] = [];
  const googleFontsToLoad: string[] = [];

  // Handle palette (backward compatible - supports both old and new format)
  if (props.globalStyles?.palette) {
    try {
      const palette = JSON.parse(props.globalStyles.palette);
      // Legacy palette colors (always include for backward compatibility)
      lines.push("--light: " + (palette.light || "#FFFFFF") + ";");
      lines.push("--lightAccent: " + (palette.lightAccent || "#F5F5F5") + ";");
      lines.push("--accent: " + (palette.accent || "#E0E0E0") + ";");
      lines.push("--darkAccent: " + (palette.darkAccent || "#757575") + ";");
      lines.push("--dark: " + (palette.dark || "#333333") + ";");

      // New semantic colors (with sensible defaults)
      lines.push("--primary: " + (palette.primary || palette.accent || "#1976D2") + ";");
      lines.push("--secondary: " + (palette.secondary || palette.darkAccent || "#424242") + ";");
      lines.push("--success: " + (palette.success || "#4CAF50") + ";");
      lines.push("--warning: " + (palette.warning || "#FF9800") + ";");
      lines.push("--error: " + (palette.error || "#F44336") + ";");
    } catch (e) {
      console.error("Failed to parse palette JSON:", e);
    }
  }

  // Handle fonts (legacy format - for backward compatibility)
  if (props.globalStyles?.fonts) {
    try {
      const fonts = JSON.parse(props.globalStyles.fonts);
      lines.push("--headingFont: '" + fonts.heading + "';");
      lines.push("--bodyFont: '" + fonts.body + "';");

      // Add fonts to load list
      if (fonts.heading && fonts.heading !== "Roboto") googleFontsToLoad.push(fonts.heading);
      if (fonts.body && fonts.body !== "Roboto") googleFontsToLoad.push(fonts.body);
    } catch (e) {
      console.error("Failed to parse fonts JSON:", e);
    }
  }

  // Handle typography (new format - scale settings only, fonts are in legacy fonts field)
  if (props.globalStyles?.typography) {
    try {
      const typography = JSON.parse(props.globalStyles.typography);
      lines.push("--font-size-base: " + (typography.baseSize || "16") + "px;");
      lines.push("--font-scale: " + (typography.scale || "1.25") + ";");
      lines.push("--line-height: " + (typography.lineHeight || "1.5") + ";");
    } catch (e) {
      console.error("Failed to parse typography JSON:", e);
    }
  }

  // Handle spacing
  if (props.globalStyles?.spacing) {
    try {
      const spacing = JSON.parse(props.globalStyles.spacing);
      lines.push("--spacing-xs: " + (spacing.xs || "4px") + ";");
      lines.push("--spacing-sm: " + (spacing.sm || "8px") + ";");
      lines.push("--spacing-md: " + (spacing.md || "16px") + ";");
      lines.push("--spacing-lg: " + (spacing.lg || "24px") + ";");
      lines.push("--spacing-xl: " + (spacing.xl || "32px") + ";");
      lines.push("--spacing-xxl: " + (spacing.xxl || "48px") + ";");
    } catch (e) {
      console.error("Failed to parse spacing JSON:", e);
    }
  }

  // Handle border radius
  if (props.globalStyles?.borderRadius) {
    try {
      const borderRadius = JSON.parse(props.globalStyles.borderRadius);
      lines.push("--radius-none: " + (borderRadius.none || "0") + ";");
      lines.push("--radius-sm: " + (borderRadius.sm || "4px") + ";");
      lines.push("--radius-md: " + (borderRadius.md || "8px") + ";");
      lines.push("--radius-lg: " + (borderRadius.lg || "16px") + ";");
      lines.push("--radius-full: " + (borderRadius.full || "9999px") + ";");
    } catch (e) {
      console.error("Failed to parse borderRadius JSON:", e);
    }
  }

  if (props.globalStyles?.customCss) lines.push(props.globalStyles.customCss);

  const css = ":root { " + lines.join("\n") + " }";

  // Dynamically load Google Fonts
  React.useEffect(() => {
    if (googleFontsToLoad.length > 0) {
      const uniqueFonts = [...new Set(googleFontsToLoad)];
      const fontList: string[] = [];
      uniqueFonts.forEach(f => fontList.push(f.replace(" ", "+") + ":wght@400"));
      const googleFontsUrl = "https://fonts.googleapis.com/css2?family=" + fontList.join("&family=") + "&display=swap";

      const existingLink = document.querySelector(`link[href="${googleFontsUrl}"]`);
      if (!existingLink) {
        const link = document.createElement("link");
        link.href = googleFontsUrl;
        link.rel = "stylesheet";
        link.type = "text/css";
        document.head.appendChild(link);
      }
    }
  }, [googleFontsToLoad.join(",")]);

  const customJs = props.globalStyles?.customJS ? (
    <div dangerouslySetInnerHTML={{ __html: props.globalStyles.customJS }} />
  ) : null;

  return (
    <>
      <style>{css}</style>
      {customJs}
    </>
  );
};
