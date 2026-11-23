"use client";

import React, { FormEventHandler } from "react";
import { ApiHelper } from "@churchapps/helpers";
import { Locale } from "../helpers";
import { TextField, Typography, Card, CardContent, Button } from "@mui/material";
import { VerificationCodeInput } from "./VerificationCodeInput";

interface Props {
  defaultEmail?: string;
  isSubmitting: boolean;
  submit: (email: string, code: string) => void;
  loginCallback: () => void;
}

const RESEND_COOLDOWN_SECONDS = 30;

const buttonSx = {
  backgroundColor: "hsl(218, 85%, 55%)",
  color: "white",
  padding: "12px",
  textTransform: "none",
  fontSize: "16px",
  fontWeight: 500,
  borderRadius: "6px",
  "&:hover": { backgroundColor: "hsl(218, 85%, 50%)" },
  "&:disabled": { backgroundColor: "#9ca3af" }
} as const;

const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "#3b82f6", fontSize: "14px", cursor: "pointer", textDecoration: "none" };

export const EmailCode: React.FC<Props> = (props) => {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [email, setEmail] = React.useState(props.defaultEmail || "");
  const [isSending, setIsSending] = React.useState(false);
  const [codeSent, setCodeSent] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const requestCode = async () => {
    if (!validEmail) { setErrors([Locale.label("login.validate.email")]); return; }
    setIsSending(true);
    try {
      const resp: any = await ApiHelper.postAnonymous("/users/requestLoginCode", { email }, "MembershipApi");
      if (resp?.errors?.length) setErrors(resp.errors);
      else {
        setErrors([]);
        setCode("");
        setCodeSent(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (e: any) {
      setErrors([e?.message || Locale.label("login.validate.email")]);
    } finally {
      setIsSending(false);
    }
  };

  const verify = (submittedCode: string) => {
    if (props.isSubmitting) return;
    if (submittedCode.length !== 6) { setErrors([Locale.label("login.validate.code")]); return; }
    setErrors([]);
    props.submit(email, submittedCode);
  };

  const sendForm: FormEventHandler = (e) => { e.preventDefault(); requestCode(); };
  const codeForm: FormEventHandler = (e) => { e.preventDefault(); verify(code); };
  const busy = isSending || props.isSubmitting;

  return (
    <Card id="email-code-card" sx={{
      width: "100%",
      maxWidth: { xs: "400px", sm: "500px" },
      backgroundColor: "white",
      border: "1px solid #e5e7eb",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
    }}>
      <CardContent sx={{ textAlign: "center", padding: "32px" }}>
        <Typography component="h1" sx={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}>
          {Locale.label("login.emailCodeTitle")}
        </Typography>
        <Typography sx={{ color: "#6b7280", marginBottom: "32px" }}>
          {codeSent ? Locale.label("login.enterCodeInstructions") : Locale.label("login.emailCodeInstructions")}
        </Typography>

        {errors.length > 0 && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "12px", textAlign: "left", marginBottom: "16px" }}>
            {errors.map((error) => <div key={error} style={{ color: "#dc2626", fontSize: "14px" }}>{error}</div>)}
          </div>
        )}

        {!codeSent ? (
          <form id="email-code-request-form" onSubmit={sendForm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <TextField
              id="email-code-email"
              name="email"
              type="email"
              label={Locale.label("login.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              autoComplete="email"
              fullWidth
            />
            <Button id="email-code-send" type="submit" variant="contained" fullWidth disabled={busy} sx={buttonSx}>
              {busy ? Locale.label("common.pleaseWait") : Locale.label("login.sendCode")}
            </Button>
            <button type="button" onClick={props.loginCallback} style={linkStyle}>{Locale.label("login.usePassword")}</button>
          </form>
        ) : (
          <form id="email-code-verify-form" onSubmit={codeForm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "14px" }}>
              <b>{email}</b>
            </Typography>
            <VerificationCodeInput value={code} onChange={setCode} onComplete={verify} disabled={busy} autoFocus />
            <Button id="email-code-submit" type="submit" variant="contained" fullWidth disabled={busy || code.length !== 6} sx={buttonSx}>
              {busy ? Locale.label("common.pleaseWait") : Locale.label("login.signIn")}
            </Button>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
              <button type="button" disabled={resendCooldown > 0 || busy} onClick={requestCode} style={{ ...linkStyle, color: resendCooldown > 0 ? "#9ca3af" : "#3b82f6", cursor: resendCooldown > 0 ? "default" : "pointer" }}>
                {resendCooldown > 0 ? `${Locale.label("login.resendCode")} (${resendCooldown}s)` : Locale.label("login.resendCode")}
              </button>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>|</span>
              <button type="button" onClick={props.loginCallback} style={linkStyle}>{Locale.label("login.usePassword")}</button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
