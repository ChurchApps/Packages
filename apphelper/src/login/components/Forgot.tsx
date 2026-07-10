"use client";

import React, { FormEventHandler } from "react";
import { ApiHelper } from "@churchapps/helpers";
import { Locale } from "../helpers";
import { ResetPasswordRequestInterface } from "@churchapps/helpers";
import { TextField, Typography, Card, CardContent, Button } from "@mui/material";
import { VerificationCodeInput } from "./VerificationCodeInput";

interface Props {
  registerCallback: () => void,
  loginCallback: () => void,
  onVerified?: (authGuid: string) => void
}

const RESEND_COOLDOWN_SECONDS = 30;

export const Forgot: React.FC<Props> = props => {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [codeSent, setCodeSent] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEmail(e.target.value);
  };

  const validateEmail = (email: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  const validate = () => {
    const result = [];
    if (!email) result.push(Locale.label("login.validate.email"));
    else if (!validateEmail(email)) result.push(Locale.label("login.validate.email"));
    setErrors(result);
    return result.length === 0;
  };

  const requestCode = () => {
    const req: ResetPasswordRequestInterface = { userEmail: email };
    return ApiHelper.postAnonymous("/users/forgot", req, "MembershipApi").then((resp: any) => {
      if (resp?.errors?.length && resp.mailConfigured === false) {
        setErrors(resp.errors);
      } else if (resp.emailed) {
        setErrors([]);
        setCodeSent(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setErrors(["We could not find an account with this email address"]);
      }
    });
  };

  const reset: FormEventHandler = (e) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitting(true);
      requestCode().finally(() => { setIsSubmitting(false); });
    }
  };

  const resend = () => {
    if (resendCooldown > 0 || isSubmitting) return;
    setCode("");
    setIsSubmitting(true);
    requestCode().finally(() => { setIsSubmitting(false); });
  };

  const verify = (submittedCode: string) => {
    if (submittedCode.length !== 6) {
      setErrors([Locale.label("login.validate.code")]);
      return;
    }
    setErrors([]);
    setIsSubmitting(true);
    ApiHelper.postAnonymous("/users/verifyCode", { email, code: submittedCode }, "MembershipApi").then((resp: any) => {
      if (resp.authGuid && props.onVerified) (props.onVerified as any)(resp.authGuid, email);
      else setErrors([Locale.label("login.validate.code")]);
    }).catch(() => {
      setErrors([Locale.label("login.validate.code")]);
    }).finally(() => { setIsSubmitting(false); });
  };

  const submitCode: FormEventHandler = (e) => {
    e.preventDefault();
    verify(code);
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
        <div style={{ marginBottom: "32px" }}>
          <img
            src="/images/logo-login.png"
            alt="Church Logo"
            style={{
              maxWidth: "100%",
              width: "auto",
              height: "auto",
              maxHeight: "80px",
              marginBottom: "16px",
              objectFit: "contain"
            }}
          />
        </div>
        <Typography
          component="h1"
          sx={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}
        >
          {Locale.label("login.resetPassword")}
        </Typography>
        <Typography sx={{ color: "#6b7280", marginBottom: "32px" }}>
          {codeSent ? Locale.label("login.enterCodeInstructions") : "Enter your email to receive a verification code"}
        </Typography>

        {errors.length > 0 && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            padding: "12px",
            textAlign: "left",
            marginBottom: "16px"
          }}>
            {errors.map((error) => (
              <div key={error} style={{ color: "#dc2626", fontSize: "14px" }}>{error}</div>
            ))}
          </div>
        )}

        {!codeSent ? (
          <form onSubmit={reset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "14px", textAlign: "left" }}>
              {Locale.label("login.resetInstructions")}
            </Typography>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label htmlFor="forgot-email" style={{ fontSize: "14px", fontWeight: 500, color: "#374151", textAlign: "left" }}>
                {Locale.label("login.email")}
              </label>
              <TextField
                id="forgot-email"
                name="forgot-email"
                type="email"
                placeholder={Locale.label("login.email")}
                value={email}
                onChange={handleChange}
                autoFocus
                required
                autoComplete="email"
                variant="outlined"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                    "& fieldset": { borderColor: "#d1d5db" },
                    "&:hover fieldset": { borderColor: "#d1d5db" },
                    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                    "& input": { color: "#111827", fontSize: "16px" }
                  },
                  "& .MuiInputLabel-root": { display: "none" }
                }}
              />
            </div>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
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
              {isSubmitting ? "Sending..." : Locale.label("login.reset")}
            </Button>

            <div style={{ textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); props.registerCallback(); }}
                style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "14px", cursor: "pointer", textDecoration: "none" }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
              >
                {Locale.label("login.register")}
              </button>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>|</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); props.loginCallback(); }}
                style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "14px", cursor: "pointer", textDecoration: "none" }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
              >
                {Locale.label("login.login")}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitCode} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "14px", textAlign: "center" }}>
                We emailed a 6-digit code to <b>{email}</b>.
            </Typography>

            <VerificationCodeInput
              value={code}
              onChange={setCode}
              onComplete={verify}
              disabled={isSubmitting}
              autoFocus
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting || code.length !== 6}
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
              {isSubmitting ? Locale.label("common.pleaseWait") : Locale.label("login.verifyCode")}
            </Button>

            <div style={{ textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                disabled={resendCooldown > 0 || isSubmitting}
                onClick={resend}
                style={{
                  background: "none",
                  border: "none",
                  color: resendCooldown > 0 ? "#9ca3af" : "#3b82f6",
                  fontSize: "14px",
                  cursor: resendCooldown > 0 ? "default" : "pointer",
                  textDecoration: "none"
                }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : Locale.label("login.resendCode")}
              </button>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>|</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); props.loginCallback(); }}
                style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "14px", cursor: "pointer", textDecoration: "none" }}
              >
                {Locale.label("login.login")}
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
