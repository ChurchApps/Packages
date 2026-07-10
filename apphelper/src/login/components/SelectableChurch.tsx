"use client";

import { Grid, Paper, Box, Typography } from "@mui/material";
import React from "react";
import { ArrayHelper } from "@churchapps/helpers";
import { ChurchInterface, GenericSettingInterface } from "@churchapps/helpers";
import { LocationOn, Church } from "@mui/icons-material";

interface Props {
  selectChurch: (churchId: string) => void,
  church: ChurchInterface
}

export const SelectableChurch: React.FC<Props> = (props) => {

  let logo: string | null = null;
  if (props.church.settings) {
    const l: GenericSettingInterface = ArrayHelper.getOne(props.church.settings, "keyName", "logoLight");
    if (l?.value) logo = l.value;
  }
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1,
        mb: 0.75,
        cursor: "pointer",
        transition: "all 0.2s ease",
        border: "1px solid transparent",
        borderRadius: 2,
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 2,
          transform: "translateY(-2px)"
        }
      }}
      onClick={() => props.selectChurch(props.church.id || "")}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, sm: 5, md: 5 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: { xs: 60, sm: 80 },
              p: 0.5
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt={`${props.church.name} logo`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain"
                }}
              />
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  backgroundColor: "grey.100",
                  borderRadius: 2
                }}
              >
                <Church sx={{ fontSize: { xs: 40, sm: 50 }, color: "grey.400" }} />
              </Box>
            )}
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 7, md: 7 }}>
          <Box>
            <Typography
              variant="h6"
              component="h3"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                mb: 0.5
              }}
            >
              {props.church.name}
            </Typography>
            {(props.church.address1 || props.church.city || props.church.state) && (
              <Box sx={{ display: "flex", alignItems: "flex-start", color: "text.secondary" }}>
                <LocationOn sx={{ fontSize: 18, mr: 0.5, mt: 0.3 }} />
                <Box>
                  {props.church.address1 && (
                    <Typography variant="body2">
                      {props.church.address1}
                    </Typography>
                  )}
                  {(props.church.city || props.church.state) && (
                    <Typography variant="body2">
                      {props.church.city && props.church.city}
                      {props.church.city && props.church.state && ", "}
                      {props.church.state}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};
