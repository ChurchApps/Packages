"use client";

import React, { FormEventHandler } from "react";
import { Locale } from "../helpers";
import { TextField, Typography, Card, CardContent, Button } from "@mui/material";

interface Props {
  isSubmitting: boolean;
  submit: (code: string) => void;
  cancel: () => void;
}

export const MfaCode: React.FC<Props> = (props) => {
  const [code, setCode] = React.useState("");

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    if (code.trim()) props.submit(code.trim());
  };

  return (
    <Card sx={{
      width: "100%",
      maxWidth: { xs: "400px", sm: "500px" },
      backgroundColor: "white",
      border: "1px solid #e5e7eb",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
    }}>
      <CardContent sx={{ textAlign: "center", padding: "32px" }}>
        <Typography component="h1" sx={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}>
          {Locale.label("login.mfaTitle")}
        </Typography>
        <Typography sx={{ color: "#6b7280", marginBottom: "24px" }}>
          {Locale.label("login.mfaInstructions")}
        </Typography>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <TextField
            id="mfa-code"
            name="mfa-code"
            label={Locale.label("login.mfaCode")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            autoComplete="one-time-code"
            inputProps={{ maxLength: 12, style: { textAlign: "center", fontSize: "22px", letterSpacing: "4px" } }}
            fullWidth
            disabled={props.isSubmitting}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={props.isSubmitting || !code.trim()}
            sx={{
              backgroundColor: "hsl(218, 85%, 55%)",
              color: "white",
              padding: "12px",
              textTransform: "none",
              fontSize: "16px",
              fontWeight: 500,
              borderRadius: "6px",
              "&:hover": { backgroundColor: "hsl(218, 85%, 50%)" },
              "&:disabled": { backgroundColor: "#9ca3af" }
            }}
          >
            {props.isSubmitting ? Locale.label("common.pleaseWait") : Locale.label("login.verifyCode")}
          </Button>
          <button
            type="button"
            onClick={props.cancel}
            style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "14px", cursor: "pointer" }}
          >
            {Locale.label("login.login")}
          </button>
        </form>
      </CardContent>
    </Card>
  );
};
