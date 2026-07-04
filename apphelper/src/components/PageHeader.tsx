import React, { ReactNode } from "react";
import { Box, Typography, Stack, Container } from "@mui/material";

interface PageHeaderProps {
  icon?: ReactNode;
  avatar?: ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: ReactNode;
  chips?: ReactNode;
  children?: ReactNode; // For action buttons
  statistics?: Array<{ icon: ReactNode; value: string; label: string }>;
  tabs?: React.ReactNode; // Rendered flush on the header's bottom edge
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon, avatar, title, subtitle, breadcrumbs, chips, children, statistics, tabs }) => {
  return (
    <Box id="page-header" sx={{
      // Vertical gradient: top edge stays uniformly --c1d5 to blend seamlessly with the AppBar above.
      background: "linear-gradient(180deg, var(--c1d5, #09245F) 0%, var(--c1d2, #114A99) 55%, var(--c1l1, #3578CC) 100%)",
      color: "#FFF",
      position: "relative",
      left: "50%",
      right: "50%",
      marginLeft: "-50vw",
      marginRight: "-50vw",
      width: "100vw",
      overflow: "hidden",
      "&::before": {
        content: "''",
        position: "absolute",
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.04)",
        pointerEvents: "none"
      }
    }}>
      <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1, pt: 3.5, pb: tabs ? 0 : 3.5 }}>
        {breadcrumbs && (
          <Box id="page-header-breadcrumbs" sx={{ mb: 1.5, fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>
            {breadcrumbs}
          </Box>
        )}
        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2, md: 4 }} alignItems={{ xs: "flex-start", md: "center" }} sx={{ width: "100%" }}>
          {(avatar || icon)
            ? (
              <Stack id="page-header-title-section" direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                {avatar
                  ? (
                    <Box id="page-header-avatar" sx={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {avatar}
                    </Box>
                  )
                  : (
                    <Box
                      id="page-header-icon"
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        borderRadius: "12px",
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {React.cloneElement(icon as React.ReactElement<any>, { sx: { fontSize: 32, color: "#FFF" } })}
                    </Box>
                  )
                }
                <Box id="page-header-text">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography id="page-header-title" sx={{ fontSize: "20px", fontWeight: 650, letterSpacing: "-0.012em", lineHeight: 1.2 }}>
                      {title}
                    </Typography>
                    {chips && (
                      <Stack id="page-header-chips" direction="row" spacing={1} alignItems="center">
                        {chips}
                      </Stack>
                    )}
                  </Stack>
                  {subtitle && (
                    <Typography id="page-header-subtitle" sx={{ fontSize: "12.5px", color: "rgba(255,255,255,0.75)", fontWeight: 400 }}>
                      {subtitle}
                    </Typography>
                  )}
                </Box>
              </Stack>
            )
            : (
              <Box id="page-header-text" sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography id="page-header-title" sx={{ fontSize: "20px", fontWeight: 650, letterSpacing: "-0.012em", lineHeight: 1.2 }}>
                    {title}
                  </Typography>
                  {chips && (
                    <Stack id="page-header-chips" direction="row" spacing={1} alignItems="center">
                      {chips}
                    </Stack>
                  )}
                </Stack>
                {subtitle && (
                  <Typography id="page-header-subtitle" sx={{ fontSize: "12.5px", color: "rgba(255,255,255,0.75)", fontWeight: 400 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            )
          }

          {children && (
            <Stack
              id="page-header-actions"
              direction="row"
              spacing={1}
              sx={{
                flexShrink: 0,
                justifyContent: { xs: "flex-start", md: "flex-end" },
                width: { xs: "100%", md: "auto" }
              }}
            >
              {children}
            </Stack>
          )}
        </Stack>

        {statistics && statistics.length > 0 && (
          <Box id="page-header-statistics" sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", mt: 3 }}>
            {statistics.map((stat, i) => (
              <Box
                key={stat.label}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  px: "22px",
                  ...(i === 0 ? { pl: 0 } : { borderLeft: "1px solid rgba(255,255,255,.22)" })
                }}
              >
                <Typography sx={{ fontSize: "18px", fontWeight: 650, fontVariantNumeric: "tabular-nums", color: "#FFF", lineHeight: 1.25 }}>
                  {stat.value}
                </Typography>
                <Typography sx={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".07em", color: "rgba(255,255,255,.62)" }}>
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {tabs && (
          <Box id="page-header-tabs" sx={{ mt: 3, width: "100%" }}>
            {tabs}
          </Box>
        )}
      </Container>
    </Box>
  );
};
