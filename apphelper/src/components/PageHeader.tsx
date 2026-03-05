import React, { ReactNode } from "react";
import { Box, Typography, Stack, Container } from "@mui/material";

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode; // For action buttons or tabs
  statistics?: Array<{ icon: ReactNode; value: string; label: string }>;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle, children, statistics }) => {
  return (
    <Box id="page-header" sx={{
      background: "linear-gradient(135deg, var(--c1d3, #0D3B6E) 0%, var(--c1, #1565C0) 40%, var(--c1l2, #568BDA) 100%)",
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
        background: "rgba(255,255,255,0.05)",
        pointerEvents: "none",
      },
      "&::after": {
        content: "''",
        position: "absolute",
        bottom: -80,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.04)",
        pointerEvents: "none",
      },
    }}>
      <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1, paddingY: 6 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2, md: 4 }} alignItems={{ xs: "flex-start", md: "center" }} sx={{ width: "100%" }}>
          {/* Left side: Title and optional Icon */}
          {icon
            ? (
              <Stack id="page-header-title-section" direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
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
                <Box id="page-header-text">
                  <Typography id="page-header-title" variant="h3" sx={{ fontWeight: 500, mb: 1 }}>
                    {title}
                  </Typography>
                  {subtitle && (
                    <Typography id="page-header-subtitle" variant="h6" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 400 }}>
                      {subtitle}
                    </Typography>
                  )}
                </Box>
              </Stack>
            )
            : (
              <Box id="page-header-text" sx={{ flex: 1 }}>
                <Typography id="page-header-title" variant="h3" sx={{ fontWeight: 500, mb: 1 }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography id="page-header-subtitle" variant="h6" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 400 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            )
          }

          {/* Right side: Action Buttons/Tabs */}
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

        {/* Statistics row */}
        {statistics && statistics.length > 0 && (
          <Stack id="page-header-statistics" direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ mt: 3 }}>
            {statistics.map((stat) => (
              <Stack key={stat.label} direction="row" spacing={1} alignItems="center">
                {React.cloneElement(stat.icon as React.ReactElement<any>, { sx: { color: "#FFF", fontSize: 20 } })}
                <Typography variant="h6" sx={{ color: "#FFF", fontWeight: 600, mr: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", fontSize: "0.875rem" }}>
                  {stat.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
};
