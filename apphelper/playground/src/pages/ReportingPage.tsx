import React from "react";
import { Container, Box, Typography, Alert, Stack, Paper } from "@mui/material";
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

export function ReportingTestPage() {

  return (
    <ComponentPage title="Reporting Components Demo">
      <Stack spacing={4}>
        <Alert severity="info">
          This page demonstrates the reporting components from @churchapps/apphelper.
          These components integrate with the ChurchApps API system for comprehensive reporting functionality.
        </Alert>

        <Alert severity="warning">
          <strong>Note:</strong> The reporting components require proper API configuration and authentication
          to function fully. This demo shows the component structure and interfaces.
        </Alert>

        {/* ReportWithFilter - Complete Reporting Solution */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            1. ReportWithFilter - Complete Reporting Solution
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            A comprehensive component that combines filtering and report output functionality.
            This is the recommended approach for most reporting needs.
          </Typography>
          <Box sx={{ mt: 2, border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
            <Typography variant="body2" color="primary" gutterBottom>
              Usage Example:
            </Typography>
            <Typography variant="body2" component="pre" sx={{ bgcolor: "grey.100", p: 1, borderRadius: 1 }}>
{`<ReportWithFilter 
  keyName="membershipReport" 
  autoRun={false} 
/>`}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This component automatically handles data fetching, filtering, and display based on the report configuration.
            </Typography>
          </Box>
        </Paper>

        {/* ReportOutput - Standalone Output */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            2. ReportOutput - Standalone Output Component
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Displays report results with export functionality (CSV, PDF) and print capabilities.
            Use this when you need custom filtering but want standard output.
          </Typography>
          <Box sx={{ mt: 2, border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
            <Typography variant="body2" color="primary" gutterBottom>
              Usage Example:
            </Typography>
            <Typography variant="body2" component="pre" sx={{ bgcolor: "grey.100", p: 1, borderRadius: 1 }}>
{`<ReportOutput 
  keyName="membershipReport" 
  report={reportConfig} 
/>`}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This component handles report execution and displays results in various formats (table, chart, tree).
            </Typography>
          </Box>
        </Paper>

        {/* ReportFilter - Standalone Filter */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            3. ReportFilter - Standalone Filter Component
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Provides filtering interface for report parameters. Use this for custom layouts where you need
            separate filter and output components.
          </Typography>
          <Box sx={{ mt: 2, border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
            <Typography variant="body2" color="primary" gutterBottom>
              Usage Example:
            </Typography>
            <Typography variant="body2" component="pre" sx={{ bgcolor: "grey.100", p: 1, borderRadius: 1 }}>
{`<ReportFilter 
  report={reportConfig} 
  onChange={handleReportChange} 
  onRun={handleReportRun} 
/>`}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This component renders filter fields based on the report's parameter configuration.
            </Typography>
          </Box>
        </Paper>

        {/* ReportFilterField - Individual Filter Field */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            4. ReportFilterField - Individual Filter Field
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Individual filter field component for building custom filter layouts.
            Use this when you need complete control over filter arrangement.
          </Typography>
          <Box sx={{ mt: 2, border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
            <Typography variant="body2" color="primary" gutterBottom>
              Usage Example:
            </Typography>
            <Typography variant="body2" component="pre" sx={{ bgcolor: "grey.100", p: 1, borderRadius: 1 }}>
{`<ReportFilterField 
  parameter={parameterConfig} 
  report={reportConfig} 
  onChange={handleParameterChange} 
/>`}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This component renders a single filter field (dropdown, date picker, text input) based on the parameter configuration.
            </Typography>
          </Box>
        </Paper>

        {/* Report Configuration Structure */}
        <Paper elevation={2} sx={{ p: 3, bgcolor: "grey.50" }}>
          <Typography variant="h5" gutterBottom>
            Report Configuration Structure
          </Typography>
          <Typography variant="body2" gutterBottom>
            Reports are configured using the ReportInterface structure:
          </Typography>
          <Box sx={{ mt: 2, border: 1, borderColor: "divider", borderRadius: 1, p: 2, bgcolor: "white" }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: "0.75rem" }}>
{`interface ReportInterface {
  keyName: string;           // Unique identifier
  displayName: string;       // Human-readable name
  description: string;       // Report description
  parameters: ParameterInterface[];  // Filter parameters
  permissions: ReportPermissionGroupInterface[];  // Access control
}

interface ParameterInterface {
  keyName: string;           // Parameter identifier
  displayName?: string;      // Field label
  source: string;            // "dropdown" | "date"
  sourceKey: string;         // Data source identifier
  options: { value: string; text: string }[];  // For dropdowns
  defaultValue: string;      // Default selection
}`}
            </Typography>
          </Box>
        </Paper>

        {/* Data Visualization Components */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Data Visualization Components
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Additional components for specific visualization needs:
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>ChartReport</strong>
              </Typography>
              <Typography variant="body2">
                Renders charts using Google Charts (column, bar, line, pie).
                Requires reportResult and output configuration.
              </Typography>
            </Box>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>TableReport</strong>
              </Typography>
              <Typography variant="body2">
                Displays data in Material-UI table format with sorting and pagination.
                Supports responsive design and custom column formatting.
              </Typography>
            </Box>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>TreeReport</strong>
              </Typography>
              <Typography variant="body2">
                Shows hierarchical data with expandable/collapsible structure.
                Perfect for organizational charts and nested data.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Integration Notes */}
        <Paper elevation={2} sx={{ p: 3, bgcolor: "info.main", color: "info.contrastText" }}>
          <Typography variant="h5" gutterBottom>
            Integration Notes
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                <strong>API Integration:</strong>
              </Typography>
              <Typography variant="body2">
                Components automatically integrate with ChurchApps APIs (AttendanceApi, MembershipApi, etc.)
                for data fetching and authentication.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Permissions:</strong>
              </Typography>
              <Typography variant="body2">
                Report access is controlled through the permissions configuration.
                Users must have appropriate API permissions to view reports.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Data Sources:</strong>
              </Typography>
              <Typography variant="body2">
                Parameters can pull data from various sources (campus, service, group, etc.)
                configured in the ChurchApps system.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </ComponentPage>
  );
}
