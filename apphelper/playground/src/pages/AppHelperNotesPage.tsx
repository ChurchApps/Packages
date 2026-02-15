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

const notesComponents = [
  {
    name: "Notes",
    description: "Complete notes management system with display, add, and edit functionality"
  },
  {
    name: "Note",
    description: "Individual note display component with edit and delete options"
  },
  {
    name: "AddNote",
    description: "Form component for creating new notes"
  }
];

export default function AppHelperNotesPage() {
  const [selectedComponent, setSelectedComponent] = React.useState<string | null>(null);

  const renderComponent = (component: any) => {
    return (
      <Alert severity="info">
        <strong>{component.name} Demo</strong>
        <br />
        {component.description}
        <br /><br />
        This component requires authentication context and API integration which may not be fully available in this demo environment.
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
    <ComponentPage title="@churchapps/apphelper - Notes Components">
      <Stack spacing={4}>
        <Alert severity="info">
          <strong>Notes Components from @churchapps/apphelper Package</strong>
          <br />
          This page demonstrates all {notesComponents.length} notes management components.
        </Alert>

        <Box>
          <Typography variant="h5" gutterBottom>
            Notes Components ({notesComponents.length} total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Click Show Demo to see component information.
          </Alert>
          {notesComponents.map(component => renderComponentCard(component))}
        </Box>

      </Stack>
    </ComponentPage>
  );
}
