"use client";

import React from "react";
import { TextField, PaperProps, InputAdornment, IconButton, Card, CardContent, Typography, Button } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Locale } from "../helpers";
import { SsoButtons } from "./SsoButtons";

interface Props {
	login: (data: any) => void,
	isSubmitting: boolean,
	setShowRegister: (showRegister: boolean) => void,
	setShowForgot: (showForgot: boolean) => void,
	setErrors: (errors: string[]) => void;
	onRegisterClick?: (email: string) => void;
	mainContainerCssProps?: PaperProps;
	defaultEmail?: string;
	defaultPassword?: string;
	showFooter?: boolean;
}

export const Login: React.FC<Props> = ({ mainContainerCssProps = {}, ...props }) => {
  const [email, setEmail] = React.useState(props.defaultEmail || "");
  const [password, setPassword] = React.useState(props.defaultPassword || "");
  const [showPassword, setShowPassword] = React.useState(false);

  const validateEmail = (email: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  const validate = () => {
    const result = [];
    if (!email) result.push(Locale.label("login.validate.email"));
    else if (!validateEmail(email)) result.push(Locale.label("login.validate.email"));
    if (!password) result.push(Locale.label("login.validate.password"));
    props.setErrors(result);
    return result.length === 0;
  };

  const submitLogin = () => {
    if (validate()) props.login({ email, password });
  };

  const handleShowRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    if (props.onRegisterClick) props.onRegisterClick(email);
    props.setShowRegister(true);
  };

  return (
    <>
      <Card id="login-card" sx={{
			  width: "100%",
			  maxWidth: { xs: "400px", sm: "500px" },
			  backgroundColor: "white",
			  border: "1px solid #e5e7eb",
			  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
			  ...mainContainerCssProps
      }}>
        <CardContent id="login-content" sx={{ textAlign: "center", padding: "32px" }}>
          <div id="login-logo" style={{ marginBottom: "32px" }}>
            <img
              id="login-logo-image"
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
            id="login-title"
            component="h1"
            sx={{
						  fontSize: "24px",
						  fontWeight: "bold",
						  color: "#111827",
						  marginBottom: "8px"
            }}
          >
            {Locale.label("login.signInTitle")}
          </Typography>
          <Typography
            sx={{
						  color: "#6b7280",
						  marginBottom: "32px"
            }}
          >
						Enter your email and password to access your church
          </Typography>

          <form id="login-form" onSubmit={(e) => { e.preventDefault(); submitLogin(); }} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label htmlFor="email" style={{ fontSize: "14px", fontWeight: 500, color: "#374151", textAlign: "left" }}>
                {Locale.label("login.email")}
              </label>
              <TextField
                id="login-email-field"
                name="email"
                type="email"
                placeholder={Locale.label("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
								    "& input": {
								      color: "#111827",
								      fontSize: "16px"
								    }
								  },
								  "& .MuiInputLabel-root": { display: "none" }
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", position: "relative" }}>
              <label htmlFor="password" style={{ fontSize: "14px", fontWeight: 500, color: "#374151", textAlign: "left" }}>
                {Locale.label("login.password")}
              </label>
              <TextField
                id="login-password-field"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={Locale.label("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                variant="outlined"
                fullWidth
                InputProps={{
								  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        id="password-visibility-toggle"
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
              id="login-submit-button"
              type="submit"
              variant="contained"
              fullWidth
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
              {props.isSubmitting ? Locale.label("common.pleaseWait") : Locale.label("login.signIn")}
            </Button>

            <SsoButtons />

            <div id="login-links" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                id="forgot-password-link"
                type="button"
                onClick={(e) => { e.preventDefault(); props.setShowForgot(true); }}
                style={{
								  background: "none",
								  border: "none",
								  color: "#3b82f6",
								  fontSize: "14px",
								  cursor: "pointer",
								  textDecoration: "none"
                }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
              >
                {Locale.label("login.forgot")}
              </button>
              <div style={{ fontSize: "14px", color: "#6b7280" }}>
                {Locale.label("login.noAcc")}{" "}
                <button
                  id="register-link"
                  type="button"
                  onClick={handleShowRegister}
                  style={{
									  background: "none",
									  border: "none",
									  color: "#3b82f6",
									  fontSize: "14px",
									  cursor: "pointer",
									  textDecoration: "none"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                  onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
                >
                  {Locale.label("login.register")}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {props.showFooter && (
        <div id="login-footer" style={{
				  position: "fixed",
				  bottom: 0,
				  left: 0,
				  right: 0,
				  backgroundColor: "#f9fafb",
				  borderTop: "1px solid #e5e7eb",
				  padding: "16px",
				  display: "flex",
				  justifyContent: "center",
				  alignItems: "center",
				  gap: "24px",
				  fontSize: "14px",
				  color: "#6b7280"
        }}>
          <span style={{ marginRight: "8px" }}>Ministry that's supported, not sold</span>
          <a
            href="https://churchapps.org/partner"
            target="_blank"
            rel="noopener noreferrer"
            style={{
						  color: "#3b82f6",
						  textDecoration: "none",
						  display: "flex",
						  alignItems: "center",
						  gap: "4px"
            }}>
            <span>💙</span> Donate
          </a>
          <a
            href="https://github.com/ChurchApps/ChurchAppsSupport/issues"
            target="_blank"
            rel="noopener noreferrer"
            style={{
						  color: "#6b7280",
						  textDecoration: "none",
						  display: "flex",
						  alignItems: "center",
						  gap: "4px"
            }}
          >
            <span>🐛</span> Report Bug
          </a>
        </div>
      )}
    </>
  );
};
