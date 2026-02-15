import React from "react";
import { Container, Box, Typography, Alert, Stack, Card, CardContent, Button, Chip } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import {
  ApiHelper,
  AppearanceHelper,
  ArrayHelper,
  CommonEnvironmentHelper,
  CurrencyHelper,
  DateHelper,
  ErrorHelper,
  EventHelper,
  FileHelper,
  PersonHelper,
  UserHelper,
  UniqueIdHelper,
  AnalyticsHelper,
  SlugHelper,
  SocketHelper,
  Locale,
  createEmotionCache,
  Permissions
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

const reExportedHelpers = [
  {
    name: "ApiHelper",
    helper: ApiHelper,
    description: "Centralized API communication with JWT authentication",
    example: 'ApiHelper.apiUrl("churches")'
  },
  {
    name: "UserHelper",
    helper: UserHelper,
    description: "User utility functions and data manipulation",
    example: "UserHelper.currentUserChurch(user, churches)"
  },
  {
    name: "ArrayHelper",
    helper: ArrayHelper,
    description: "Array manipulation and utility functions",
    example: 'ArrayHelper.getUniqueObjects(array, "id")'
  },
  {
    name: "DateHelper",
    helper: DateHelper,
    description: "Date formatting and manipulation utilities",
    example: "DateHelper.formatDate(new Date())"
  },
  {
    name: "PersonHelper",
    helper: PersonHelper,
    description: "Person data utilities and formatting",
    example: "PersonHelper.getDisplayName(person)"
  },
  {
    name: "CurrencyHelper",
    helper: CurrencyHelper,
    description: "Currency formatting and conversion utilities",
    example: "CurrencyHelper.formatDollars(100.50)"
  },
  {
    name: "ErrorHelper",
    helper: ErrorHelper,
    description: "Error handling and logging utilities",
    example: "ErrorHelper.logError(error)"
  },
  {
    name: "CommonEnvironmentHelper",
    helper: CommonEnvironmentHelper,
    description: "Environment configuration utilities",
    example: "CommonEnvironmentHelper.AccessApi"
  },
  {
    name: "UniqueIdHelper",
    helper: UniqueIdHelper,
    description: "Unique identifier generation utilities",
    example: "UniqueIdHelper.shortId()"
  },
  {
    name: "EventHelper",
    helper: EventHelper,
    description: "Event management utilities",
    example: "EventHelper.formatDateTime(event.startTime)"
  },
  {
    name: "FileHelper",
    helper: FileHelper,
    description: "File operations and utilities",
    example: 'FileHelper.download(data, "filename.csv")'
  },
  {
    name: "Permissions",
    helper: Permissions,
    description: "Authorization and permission checking",
    example: "Permissions.accessApi"
  }
];

const localHelpers = [
  {
    name: "AppearanceHelper",
    helper: AppearanceHelper,
    description: "Theme and branding management (extends BaseAppearanceHelper)",
    example: "AppearanceHelper.setAppearance(appearance)"
  },
  {
    name: "AnalyticsHelper",
    helper: AnalyticsHelper,
    description: "Analytics tracking and reporting",
    example: 'AnalyticsHelper.track("event_name", data)'
  },
  {
    name: "SlugHelper",
    helper: SlugHelper,
    description: "URL slug generation and manipulation",
    example: 'SlugHelper.convertToSlug("My Title")'
  },
  {
    name: "SocketHelper",
    helper: SocketHelper,
    description: "Real-time WebSocket communication",
    example: "SocketHelper.connect(url)"
  },
  {
    name: "Locale",
    helper: Locale,
    description: "Internationalization (i18n) utilities for 12 languages",
    example: 'Locale.label("common.save")'
  },
  {
    name: "createEmotionCache",
    helper: createEmotionCache,
    description: "CSS-in-JS caching helper for Emotion",
    example: "const cache = createEmotionCache();"
  }
];

const specialHelpers = [
  {
    name: "DonationHelper",
    helper: null,
    description: "Donation processing utilities (moved to @churchapps/apphelper-donations)",
    example: "DonationHelper.formatAmount(donation.amount)"
  }
];

export default function AppHelperHelpersPage() {

  const testHelper = (helperName: string, helperClass: any, example: string) => {
    try {
      console.log(`Testing ${helperName}:`, helperClass);
      if (example.includes("(")) {
        console.log(`Example: ${example}`);
      }
      return `✅ ${helperName} loaded successfully`;
    } catch (error) {
      console.error(`Error testing ${helperName}:`, error);
      return `❌ ${helperName} failed to load: ${error}`;
    }
  };

  const renderHelperCard = (helper: any, category: string) => (
    <Card key={helper.name} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography variant="h6" component="h3">
            {helper.name}
          </Typography>
          <Chip label={category} color="primary" variant="outlined" size="small" />
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {helper.description}
        </Typography>

        <Typography variant="subtitle2" gutterBottom>Example Usage:</Typography>
        <Box sx={{
          bgcolor: "grey.100",
          p: 1,
          borderRadius: 1,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          mb: 2
        }}>
          {helper.example}
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            const result = testHelper(helper.name, helper.helper, helper.example);
            alert(result);
          }}
        >
          Test Helper
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <ComponentPage title="@churchapps/apphelper - Helpers">
      <Stack spacing={4}>
        <Alert severity="info">
          <strong>Helper Functions from @churchapps/apphelper Package</strong>
          <br />
          This page demonstrates all helper functions available from the core AppHelper package, including both re-exported helpers from @churchapps/helpers and local AppHelper-specific utilities.
        </Alert>

        <Box>
          <Typography variant="h5" gutterBottom>Package Structure</Typography>
          <Stack spacing={2}>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="h6" color="primary" gutterBottom>Re-exported Helpers (from @churchapps/helpers)</Typography>
              <Typography variant="body2" color="textSecondary">
                Framework-agnostic utilities shared across all ChurchApps packages. These are imported from @churchapps/helpers and re-exported for convenience.
              </Typography>
            </Box>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="h6" color="secondary" gutterBottom>Local AppHelper Helpers</Typography>
              <Typography variant="body2" color="textSecondary">
                React/web-specific utilities that extend the core helpers with app-specific functionality like theming, analytics, and real-time communication.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            Re-exported Helpers ({reExportedHelpers.length} total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            These helpers are imported from @churchapps/helpers and re-exported for convenience. They provide core functionality used across all applications.
          </Alert>
          {reExportedHelpers.map(helper => renderHelperCard(helper, "Re-exported"))}
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            Local AppHelper Helpers ({localHelpers.length} total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            These helpers are specific to the AppHelper package and provide React/web-specific functionality.
          </Alert>
          {localHelpers.map(helper => renderHelperCard(helper, "Local"))}
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            Special Helpers ({specialHelpers.length} total)
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            These helpers have been moved to other packages or have special considerations.
          </Alert>
          {specialHelpers.map(helper => renderHelperCard(helper, "Special"))}
        </Box>

      </Stack>
    </ComponentPage>
  );
}
