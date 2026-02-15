import React from "react";
import { Container, Box, Typography, Alert, Stack, Button, Card, CardContent } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";

function ComponentPage({ children, title }: { children: React.ReactNode, title: string }) {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 2, mb: 2 }}>
        <Link to="/">← Back to Home</Link>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
          {title}
        </Typography>
        <ErrorBoundary>
          <Box sx={{ mt: 3 }}>
            {children}
          </Box>
        </ErrorBoundary>
      </Box>
    </Container>
  );
}

const loginComponents = [
  {
    name: "LoginPage",
    description: "Complete login page with integrated authentication flow"
  },
  {
    name: "LogoutPage",
    description: "Logout page with cleanup and redirect functionality"
  },
  {
    name: "Login",
    description: "Basic login form component"
  },
  {
    name: "Register",
    description: "User registration form component"
  },
  {
    name: "Forgot",
    description: "Forgot password form component"
  }
];

export default function LoginComponentsPage() {
  const [selectedComponent, setSelectedComponent] = React.useState<string | null>(null);

  const renderComponent = (component: any) => {
    return (
      <Alert severity="info">
        <strong>{component.name} Demo</strong>
        <br />
        {component.description}
        <br /><br />
        This component provides authentication functionality and integrates with the ChurchApps authentication system.
      </Alert>
    );
  };

  const renderComponentCard = (component: any) => (
    <Card key={component.name} sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Typography variant="h6" component="h3">
            {component.name}
          </Typography>
          <Button
            variant={selectedComponent === component.name ? "contained" : "outlined"}
            size="small"
            onClick={() => setSelectedComponent(selectedComponent === component.name ? null : component.name)}
          >
            {selectedComponent === component.name ? "Hide" : "Show"} Demo
          </Button>
        </Box>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {component.description}
        </Typography>

        {selectedComponent === component.name && (
          <Box sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            mt: 2
          }}>
            <Typography variant="subtitle2" gutterBottom>Component Information:</Typography>
            <ErrorBoundary>
              {renderComponent(component)}
            </ErrorBoundary>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ComponentPage title="@churchapps/apphelper-login - Authentication Components">
      <Stack spacing={4}>
        <Alert severity="info">
          <strong>Authentication Components from @churchapps/apphelper-login Package</strong>
          <br />
          This page demonstrates all {loginComponents.length} authentication components with functional authentication services.
        </Alert>

        <Box>
          <Typography variant="h5" gutterBottom>
            Authentication Components ({loginComponents.length} total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Click Show Demo to see component information and capabilities.
          </Alert>
          {loginComponents.map(component => renderComponentCard(component))}
        </Box>

      </Stack>
    </ComponentPage>
  );
}
