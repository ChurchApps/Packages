"use client";

import React, { FormEventHandler } from "react";
import { ApiHelper } from "@churchapps/helpers";
import { Locale } from "../helpers";
import { ResetPasswordRequestInterface, ResetPasswordResponseInterface } from "@churchapps/helpers";
import { TextField, Typography, Card, CardContent, Button } from "@mui/material";

interface Props {
  registerCallback: () => void,
  loginCallback: () => void
}

export const Forgot: React.FC<Props> = props => {
  const [errors, setErrors] = React.useState([]);
  const [successMessage, setSuccessMessage] = React.useState<React.ReactElement>(null);
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEmail(e.target.value);
  };

  const validateEmail = (email: string) => (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email));

  const validate = () => {
    const result = [];
    if (!email) result.push(Locale.label("login.validate.email"));
    else if (!validateEmail(email)) result.push(Locale.label("login.validate.email"));
    setErrors(result);
    return result.length === 0;
  };

  const reset: FormEventHandler = (e) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitting(true);
      const req: ResetPasswordRequestInterface = { userEmail: email };
      ApiHelper.postAnonymous("/users/forgot", req, "MembershipApi").then((resp: ResetPasswordResponseInterface) => {
        if (resp.emailed) {
          setErrors([]);
          setSuccessMessage(
            <Typography textAlign="center" marginTop="35px">
              {Locale.label("login.resetSent")} <br /><br />
              <button
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
                onClick={(e) => { e.preventDefault(); props.loginCallback(); }}
              >
                {Locale.label("login.goLogin")}
              </button>
            </Typography>
          );
          setEmail("");
        } else {
          setErrors(["We could not find an account with this email address"]);
          setSuccessMessage(<></>);
        }
      }).finally(() => { setIsSubmitting(false); });
    }
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
            sx={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "8px"
            }}
          >
            {Locale.label("login.resetPassword")}
          </Typography>
          <Typography
            sx={{
              color: "#6b7280",
              marginBottom: "32px"
            }}
          >
            Enter your email to receive password reset instructions
          </Typography>

          <form onSubmit={reset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

            {successMessage ? (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                {successMessage}
              </div>
            ) : (
              <>
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
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && reset}
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
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>|</span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); props.loginCallback(); }}
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
                    {Locale.label("login.login")}
                  </button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
  );
};
