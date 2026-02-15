import React from "react";
import { Container, Box, Typography, Alert, Stack, Button, Card, CardContent } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import {
  SiteHeader,
  Banner
} from "../../../src";

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

const headerComponents = [
  {
    name: "SiteHeader",
    component: SiteHeader,
    description: "Complete site header with navigation, user menu, and branding"
  },
  {
    name: "Banner",
    component: Banner,
    description: "Alert banner component for announcements and notifications"
  }
];

export default function AppHelperHeadersPage() {
  const [selectedComponent, setSelectedComponent] = React.useState<string | null>(null);

  const renderComponent = (component: any) => {
    switch (component.name) {
      case "SiteHeader":
        return (
          <Alert severity="info">
            <strong>SiteHeader Demo</strong>
            <br />
            SiteHeader is a complex layout component used as the main application header.
          </Alert>
        );

      case "Banner":
        return (
          <Alert severity="info">
            Banner component demos would appear here with different severity types (info, warning, error, success).
          </Alert>
        );

      default:
        return <Alert severity="error">Unknown component: {component.name}</Alert>;
    }
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
            <Typography variant="subtitle2" gutterBottom>Live Demo:</Typography>
            <ErrorBoundary>
              {renderComponent(component)}
            </ErrorBoundary>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ComponentPage title="@churchapps/apphelper - Header Components">
      <Stack spacing={4}>
        <Alert severity="info">
          <strong>Header Components from @churchapps/apphelper Package</strong>
          <br />
          This page demonstrates all {headerComponents.length} header components that provide application layout and notification capabilities.
        </Alert>

        <Box>
          <Typography variant="h5" gutterBottom>
            Header Components ({headerComponents.length} total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Click "Show Demo" to see live interactive examples.
          </Alert>
          {headerComponents.map(component => renderComponentCard(component))}
        </Box>

      </Stack>
    </ComponentPage>
  );
}
