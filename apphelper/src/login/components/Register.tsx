"use client";

import React, { FormEventHandler } from "react";
import { LoginResponseInterface, RegisterUserInterface, UserInterface, CheckEmailResponseInterface } from "@churchapps/helpers";
import { ApiHelper } from "@churchapps/helpers";
import { AnalyticsHelper, Locale } from "../helpers";
import { TextField, Card, CardContent, Typography, Button, Alert } from "@mui/material";
import { VerificationCodeInput } from "./VerificationCodeInput";

interface Props {
  appName?: string,
  appUrl?: string,
  updateErrors: (errors: string[]) => void,
  loginCallback?: () => void
  userRegisteredCallback?: (user: UserInterface) => Promise<void>;
  onVerified?: (authGuid: string, email: string) => void;
  defaultEmail?: string;
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultChurchId?: string;
  defaultChurchName?: string;
}

const RESEND_COOLDOWN_SECONDS = 30;

export const Register: React.FC<Props> = (props) => {

  const cleanAppUrl = () => {
    if (!props.appUrl) return null;
    else {
      const index = props.appUrl.indexOf("/", 9);
      if (index === -1) return props.appUrl;
      else return props.appUrl.substring(0, index);
    }
  };

  const [registered, setRegistered] = React.useState(false);
  const [user, setUser] = React.useState<RegisterUserInterface>({ firstName: props.defaultFirstName || "", lastName: props.defaultLastName || "", email: props.defaultEmail || "", appName: props.appName, appUrl: cleanAppUrl(), churchId: props.defaultChurchId || undefined });
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [matchedChurchName, setMatchedChurchName] = React.useState(props.defaultChurchName || "");
  const [code, setCode] = React.useState("");
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const checkEmailForMatch = async (emailToCheck: string) => {
    if (!emailToCheck || !validateEmail(emailToCheck)) return;
    try {
      const resp: CheckEmailResponseInterface = await ApiHelper.postAnonymous("/users/checkEmail", { email: emailToCheck }, "MembershipApi");
      if (resp.exists) {
        props.updateErrors(["An account already exists for this email. Please sign in instead."]);
      } else if (resp.peopleMatches.length > 0) {
        const match = resp.peopleMatches[0];
        const u = { ...user, email: emailToCheck };
        if (!u.firstName) u.firstName = match.firstName;
        if (!u.lastName) u.lastName = match.lastName;
        if (resp.peopleMatches.length === 1) {
          u.churchId = match.churchId;
          setMatchedChurchName(match.churchName);
        }
        setUser(u);
      }
    } catch { /* silently ignore lookup failures */ }
  };

  const handleRegisterErrors = (errs: string[]) => {
    props.updateErrors(errs);
  };

  const handleRegisterSuccess = (resp: LoginResponseInterface) => {
    setRegistered(true);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    AnalyticsHelper.logEvent("User", "Register");
    if (props.userRegisteredCallback) props.userRegisteredCallback(resp.user);
  };

  const validateEmail = (email: string) => (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/.test(email));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const u = { ...user };
    switch (e.target.name) {
      case "firstName": u.firstName = e.target.value; break;
      case "lastName": u.lastName = e.target.value; break;
      case "email": u.email = e.target.value; break;
    }
    setUser(u);
  };

  const validate = () => {
    const errs: string[] = [];
    if (!user.email?.trim()) errs.push(Locale.label("login.validate.email"));
    else if (!validateEmail(user.email)) errs.push(Locale.label("login.validate.email"));
    if (!user.firstName?.trim()) errs.push(Locale.label("login.validate.firstName"));
    if (!user.lastName?.trim()) errs.push(Locale.label("login.validate.lastName"));
    setErrors(errs);
    return errs.length === 0;
  };

  const register: FormEventHandler = (e) => {
    e.preventDefault();
    props.updateErrors([]);
    if (validate()) {
      setIsSubmitting(true);
      ApiHelper.postAnonymous("/users/register", user, "MembershipApi")
        .then((resp: any) => {
          if (resp.errors) handleRegisterErrors(resp.errors);
          else handleRegisterSuccess(resp);
        })
        .catch((e: any) => { props.updateErrors([e.toString()]); throw e; })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  const resend = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setCode("");
    try {
      await ApiHelper.postAnonymous("/users/forgot", { userEmail: user.email }, "MembershipApi");
      setErrors([]);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setErrors([err?.toString() || "Failed to resend code"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verify = async (submittedCode: string) => {
    if (submittedCode.length !== 6) {
      setErrors([Locale.label("login.validate.code")]);
      return;
    }
    setErrors([]);
    setIsSubmitting(true);
    try {
      const resp: any = await ApiHelper.postAnonymous("/users/verifyCode", { email: user.email, code: submittedCode }, "MembershipApi");
      if (resp.errors) {
        setErrors(resp.errors.map((err: any) => typeof err === "string" ? err : err.msg || "Invalid code"));
      } else if (resp.authGuid && props.onVerified) {
        props.onVerified(resp.authGuid, user.email);
      }
    } catch (err: any) {
      setErrors([err?.toString() || "Invalid code"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCode: FormEventHandler = (e) => {
    e.preventDefault();
    verify(code);
  };

  if (registered) {
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
                style={{ maxWidth: "100%", width: "auto", height: "auto", maxHeight: "80px", marginBottom: "16px", objectFit: "contain" }}
              />
            </div>
            <Typography
              component="h1"
              sx={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}
            >
              {Locale.label("login.enterCode")}
            </Typography>
            <Typography sx={{ color: "#6b7280", marginBottom: "24px" }}>
              We emailed a 6-digit code to <b>{user.email}</b>.
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

            <form onSubmit={submitCode} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                  onClick={(e) => { e.preventDefault(); if (props.loginCallback) props.loginCallback(); }}
                  style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "14px", cursor: "pointer", textDecoration: "none" }}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
    );
  }

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
              style={{ maxWidth: "100%", width: "auto", height: "auto", maxHeight: "80px", marginBottom: "16px", objectFit: "contain" }}
            />
          </div>
          <Typography
            component="h1"
            sx={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}
          >
            Create Account
          </Typography>
          <Typography sx={{ color: "#6b7280", marginBottom: "32px" }}>
            Create a new account to access your church
          </Typography>

          <form onSubmit={register} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {matchedChurchName && (
              <Alert severity="info" sx={{ textAlign: "left" }}>
                We found your record at <b>{matchedChurchName}</b>. Complete registration to link your account.
              </Alert>
            )}
            {errors.length > 0 && (
              <div style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                padding: "12px",
                textAlign: "left"
              }}>
                {errors.map((error) => (
                  <div key={error} style={{ color: "#dc2626", fontSize: "14px" }}>{error}</div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label htmlFor="firstName" style={{ fontSize: "14px", fontWeight: 500, color: "#374151", textAlign: "left" }}>
                  First Name
                </label>
                <TextField
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="First Name"
                  value={user.firstName}
                  onChange={handleChange}
                  required
                  autoComplete="given-name"
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

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label htmlFor="lastName" style={{ fontSize: "14px", fontWeight: 500, color: "#374151", textAlign: "left" }}>
                  Last Name
                </label>
                <TextField
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Last Name"
                  value={user.lastName}
                  onChange={handleChange}
                  required
                  autoComplete="family-name"
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
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label htmlFor="email" style={{ fontSize: "14px", fontWeight: 500, color: "#374151", textAlign: "left" }}>
                Email
              </label>
              <TextField
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                value={user.email}
                onChange={handleChange}
                onBlur={(e) => checkEmailForMatch(e.target.value)}
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
              {isSubmitting ? "Please wait..." : "Register"}
            </Button>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#6b7280" }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); if (props.loginCallback) props.loginCallback(); }}
                  style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "14px", cursor: "pointer", textDecoration: "none" }}
                >
                  Sign in
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
  );
};
