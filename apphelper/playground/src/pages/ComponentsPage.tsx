import React from "react";
import { Container, Box, Typography, Alert, Stack, Button } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import UserContext from "../UserContext";
import {
  ErrorMessages,
  ExportLink,
  DisplayBox,
  FloatingSupport,
  InputBox,
  Loading,
  SmallButton
} from "../../../src";
// Mock data removed - using minimal inline data for demo purposes

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

export function ComponentsTestPage() {
  const context = React.useContext(UserContext);
  const [showSupportModal, setShowSupportModal] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [savedData, setSavedData] = React.useState<any>(null);

  const handleSave = () => {
    setSavedData({ saved: true, timestamp: new Date() });
    console.log("Data saved!");
  };

  const handleCancel = () => {
    console.log("Action cancelled");
  };

  const handleError = () => {
    setErrors(["Sample error message", "Another error occurred", "Validation failed"]);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <ComponentPage title="Core Components - Functional Examples">
      <Stack spacing={4}>
        <Alert severity="info">
          This page demonstrates functional AppHelper components with real interactions, mock data, and proper context.
        </Alert>

        <Box>
          <Typography variant="h6" gutterBottom>ErrorMessages</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Component for displaying error messages with dismiss functionality
          </Alert>
          <Button onClick={handleError} variant="outlined" sx={{ mr: 2 }}>
            Generate Sample Errors
          </Button>
          <Button onClick={clearErrors} variant="outlined">
            Clear Errors
          </Button>
          <Box sx={{ mt: 2 }}>
            <ErrorMessages errors={errors} />
          </Box>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>Loading</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Loading spinner component
          </Alert>
          <Loading />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>SmallButton</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Compact button component with icon support
          </Alert>
          <Stack direction="row" spacing={2}>
            <SmallButton
              icon="save"
              onClick={handleSave}
              text="Save"
              color="primary"
            />
            <SmallButton
              icon="delete"
              onClick={() => console.log("Delete clicked")}
              text="Delete"
              color="error"
            />
            <SmallButton
              icon="add"
              onClick={() => console.log("Add clicked")}
              text="Add"
              color="success"
            />
          </Stack>
          {savedData && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Data saved at: {savedData.timestamp.toLocaleTimeString()}
            </Alert>
          )}
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>DisplayBox</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Container component with header, icon, and help text
          </Alert>
          <DisplayBox
            headerText="Sample Data Display"
            headerIcon="people"
            help="This is a sample display box with mock data"
          >
            <Typography>This is content inside the DisplayBox component.</Typography>
            <Typography sx={{ mt: 1 }}>
              Current user: {context?.person?.name?.display || "No user"}
            </Typography>
            <Typography>
              Church: {context?.userChurch?.church?.name || "No church"}
            </Typography>
          </DisplayBox>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>InputBox</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Enhanced input container with save/cancel functionality
          </Alert>
          <InputBox
            headerText="Edit Person Information"
            headerIcon="edit"
            saveFunction={handleSave}
            cancelFunction={handleCancel}
            help="Edit the person's information below"
          >
            <Stack spacing={2}>
              <input
                type="text"
                placeholder="First Name"
                defaultValue={context?.person?.name?.first || ""}
                style={{ width: "100%", padding: "8px" }}
              />
              <input
                type="text"
                placeholder="Last Name"
                defaultValue={context?.person?.name?.last || ""}
                style={{ width: "100%", padding: "8px" }}
              />
              <input
                type="email"
                placeholder="Email"
                defaultValue={context?.person?.contactInfo?.email || ""}
                style={{ width: "100%", padding: "8px" }}
              />
            </Stack>
          </InputBox>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>HelpIcon</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Icon with tooltip help text
          </Alert>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography>Need help?</Typography>
            {/* <HelpIcon text="This is helpful information displayed in a tooltip when you hover over the icon" /> */}
            <Typography variant="body2" color="textSecondary">HelpIcon component would appear here (requires correct props)</Typography>
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>ExportLink</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Link component for data export functionality
          </Alert>
          <ExportLink
            data={[]}
            filename="sample-export"
            text="Export Sample Data"
          />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>Notes</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Notes component for managing notes on content
          </Alert>
          {context ? (
            <Typography variant="body2" color="textSecondary">Notes component would appear here (requires correct props)</Typography>
          ) : (
            <Typography variant="body2" color="textSecondary">Notes requires authentication</Typography>
          )}
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>SupportModal</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Modal for support/help functionality
          </Alert>
          <Button onClick={() => setShowSupportModal(true)} variant="outlined">
            Open Support Modal
          </Button>
          {context && showSupportModal && (
            <Typography variant="body2" color="textSecondary">SupportModal would appear here (requires correct props)</Typography>
          )}
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>FloatingSupport</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Floating support button (check bottom-right corner of the page)
          </Alert>
          {context && (
            <FloatingSupport
              appName="Playground"
            />
          )}
        </Box>
      </Stack>
    </ComponentPage>
  );
}
