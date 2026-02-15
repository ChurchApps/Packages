import React from "react";
import { useLocation } from "react-router-dom";
import { Container, Box, Typography, Button, Alert } from "@mui/material";
import { Link } from "react-router-dom";
import UserContext from "../UserContext";

interface RequireAuthProps {
  children: React.ReactElement;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const context = React.useContext(UserContext) as any;
  const location = useLocation();

  // If user is not authenticated, show login prompt
  if (!context?.user) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Typography component="h1" variant="h4" gutterBottom>
            Authentication Required
          </Typography>

          <Alert severity="warning" sx={{ mb: 3, width: "100%" }}>
            <strong>Login Required</strong>
            <br />
            This page contains components that require user authentication.
            Please login to access these features.
          </Alert>

          <Box sx={{ width: "100%", textAlign: "center" }}>
            <Button
              component={Link}
              to="/auth"
              variant="contained"
              color="primary"
              size="large"
              sx={{ mb: 2, mr: 2 }}
            >
              Go to Login
            </Button>

          </Box>

          <Box sx={{ mt: 3, width: "100%" }}>
            <Typography variant="body2" color="textSecondary" align="center">
              You were trying to access: <strong>{location.pathname}</strong>
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // User is authenticated, render the protected component
  return children;
};

export default RequireAuth;
