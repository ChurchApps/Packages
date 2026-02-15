import React from "react";
import { Container, Box, Typography, Alert, Stack, Button, Card, CardContent, Chip } from "@mui/material";
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

const reportingComponents = [
  {
    name: "ReportFilter",
    description: "Filter component for reports with date ranges, dropdowns, and search fields",
    usage: ["Used internally by ReportWithFilter"],
    category: "Filter",
    complexity: "Medium"
  },
  {
    name: "ReportFilterField",
    description: "Individual filter field component for custom filter layouts",
    usage: ["Used internally by ReportFilter"],
    category: "Field",
    complexity: "Low"
  },
  {
    name: "ReportOutput",
    description: "Display component for report results with tables, charts, and export options",
    usage: ["Used internally by ReportWithFilter"],
    category: "Output",
    complexity: "High"
  },
  {
    name: "ReportWithFilter",
    description: "Complete reporting solution combining filters and output display",
    usage: ["Available for use in reporting features"],
    category: "Container",
    complexity: "High"
  }
];

export default function AppHelperReportingPage() {
  const [selectedComponent, setSelectedComponent] = React.useState<string | null>(null);

  const renderComponent = (component: any) => {
    return (
      <Alert severity="warning">
        <strong>{component.name} Demo</strong>
        <br />
        {component.description}
        <br /><br />
        These reporting components have been removed from active use but remain available for backward compatibility.
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
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip label={component.category} color="primary" variant="outlined" size="small" />
            <Chip
              label={component.complexity}
              color={component.complexity === "High" ? "error" : component.complexity === "Medium" ? "warning" : "success"}
              variant="outlined"
              size="small"
            />
            <Button
              variant={selectedComponent === component.name ? "contained" : "outlined"}
              size="small"
              onClick={() => setSelectedComponent(selectedComponent === component.name ? null : component.name)}
            >
              {selectedComponent === component.name ? "Hide" : "Show"} Info
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {component.description}
        </Typography>

        <Typography variant="subtitle2" gutterBottom>Usage:</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 0.5 }}>
          {component.usage.map((usage: string, index: number) => (
            <Chip
              key={index}
              label={usage}
              size="small"
              color="info"
              variant="outlined"
            />
          ))}
        </Stack>

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
    <ComponentPage title="@churchapps/apphelper - Reporting Components">
      <Stack spacing={4}>
        <Alert severity="info">
          <strong>Reporting Components from @churchapps/apphelper Package</strong>
          <br />
          This page demonstrates all {reportingComponents.length} reporting components that provide filtering and data display capabilities.
        </Alert>

        <Alert severity="warning">
          <strong>Deprecation Notice</strong>
          <br />
          These reporting components were recently removed from active use as noted in the usage report.
          They remain available for backward compatibility.
        </Alert>

        <Box>
          <Typography variant="h5" gutterBottom>
            Reporting Components ({reportingComponents.length} total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Click Show Info to see component information.
          </Alert>
          {reportingComponents.map(component => renderComponentCard(component))}
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>Migration Status</Typography>
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Component Status</Typography>
                <Typography variant="body2">
                  These components have been streamlined out of the core AppHelper package to improve focus on essential UI functionality.
                  Applications should consider migrating to application-specific reporting solutions or third-party libraries.
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Stack>
    </ComponentPage>
  );
}
