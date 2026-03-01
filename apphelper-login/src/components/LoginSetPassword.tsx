"use client";

import React from "react";
import { IconButton, InputAdornment, TextField, Typography, Card, CardContent, Button } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { LoginResponseInterface, UserInterface } from "@churchapps/helpers";
import { ApiHelper } from "@churchapps/helpers";
import { Locale } from "../helpers";

interface Props {
  appName: string,
  appUrl: string,
  setErrors: (errors: string[]) => void,
  setShowForgot: (showForgot: boolean) => void,
  isSubmitting: boolean,
  auth: string,
  login: (data: any) => void,
}

export const LoginSetPassword: React.FC<Props> = props => {
  const [password, setPassword] = React.useState("");
  const [verifyPassword, setVerifyPassword] = React.useState("");
  const [user, setUser] = React.useState<UserInterface>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [linkExpired, setLinkExpired] = React.useState(false);

  const validate = () => {
    const result = [];
    if (!password) result.push(Locale.label("login.validate.password"));
    else if (password.length < 8) result.push(Locale.label("login.validate.passwordLength"));
    else if (password !== verifyPassword) result.push(Locale.label("login.validate.passwordMatch"));
    props.setErrors(result);
    return result.length === 0;
  };

  const submitChangePassword = () => {
    if (linkExpired) {
      window.open("/login", "_blank");
    } else if (validate()) {
      submit();
    }
  };

  const loadUser = () => {
    ApiHelper.postAnonymous("/users/login", { authGuid: props.auth }, "MembershipApi").then((resp: LoginResponseInterface) => {
      if (resp.user) setUser(resp.user);
      else props.setShowForgot(true);
    }).catch(() => {
      props.setShowForgot(true);
    });
  };

  const submit = async () => {
    const resp = await ApiHelper.postAnonymous("/users/setPasswordGuid", { authGuid: props.auth, newPassword: password, appName: props.appName, appUrl: props.appUrl }, "MembershipApi");
    if (resp.success) props.login({ email: user.email, password });
    else props.setShowForgot(true);
  };

  React.useEffect(() => {
    //Get the timestamp from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const timestampParam = urlParams.get("timestamp");
    if (timestampParam) {
      const linkTimestamp = parseInt(timestampParam, 10);
      const currentTime = Date.now();

      //Check if the link is expired (2 min)
      if (currentTime - linkTimestamp > 600000) {
        setLinkExpired(true);
      } else {
        loadUser();
      }
    } else {
      setLinkExpired(true); //No timestamp means link is invalid
    }
  }, []);

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
            sx={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "8px"
            }}
          >
            {Locale.label("login.setPassword")}
          </Typography>
          <Typography
            sx={{
              color: "#6b7280",
              marginBottom: "32px"
            }}
          >
            {linkExpired ? "Your link has expired" : `Welcome back ${user?.firstName || ""}. Please set your password.`}
          </Typography>

          {linkExpired ? (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
              <Typography sx={{ color: "#dc2626", marginBottom: "16px" }}>
                {Locale.label("login.expiredLink")}
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={submitChangePassword}
                disabled={props.isSubmitting}
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
                {Locale.label("login.requestLink")}
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submitChangePassword(); }} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {user && (
                <Typography sx={{ color: "#6b7280", textAlign: "center", marginBottom: "8px" }}>
                  {Locale.label("login.welcomeBack")} {user.firstName}.
                </Typography>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label htmlFor="new-password" style={{ fontSize: "14px", fontWeight: 500, color: "#374151", textAlign: "left" }}>
                  {Locale.label("login.setPassword")}
                </label>
                <TextField
                  id="new-password"
                  name="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={Locale.label("login.setPassword")}
                  value={password}
                  onChange={(e) => { e.preventDefault(); setPassword(e.target.value); }}
                  required
                  autoComplete="new-password"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "#6b7280" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      paddingRight: "10px",
                      "& fieldset": { borderColor: "#d1d5db" },
                      "&:hover fieldset": { borderColor: "#d1d5db" },
                      "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                      "& input": {
                        color: "#111827",
                        fontSize: "16px"
                      }
                    },
                    "& .MuiInputLabel-root": { display: "none" }
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label htmlFor="verify-password" style={{ fontSize: "14px", fontWeight: 500, color: "#374151", textAlign: "left" }}>
                  {Locale.label("login.verifyPassword")}
                </label>
                <TextField
                  id="verify-password"
                  name="verify-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={Locale.label("login.verifyPassword")}
                  value={verifyPassword}
                  onChange={(e) => { e.preventDefault(); setVerifyPassword(e.target.value); }}
                  required
                  autoComplete="new-password"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "#6b7280" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      paddingRight: "10px",
                      "& fieldset": { borderColor: "#d1d5db" },
                      "&:hover fieldset": { borderColor: "#d1d5db" },
                      "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                      "& input": {
                        color: "#111827",
                        fontSize: "16px"
                      }
                    },
                    "& .MuiInputLabel-root": { display: "none" }
                  }}
                />
              </div>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={props.isSubmitting || !user}
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
                {(props.isSubmitting || !user) ? Locale.label("common.pleaseWait") : Locale.label("login.signIn")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
  );
};
