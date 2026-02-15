import React from "react";
import { Container, Box, Typography, Alert, Stack, Button, Card, CardContent } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import { MarkdownEditor, MarkdownPreview, MarkdownPreviewLight } from "../../../src";

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

const markdownComponents = [
  {
    name: "MarkdownEditor",
    description: "Rich text editor built on Lexical framework with markdown support"
  },
  {
    name: "MarkdownPreview",
    description: "Full-featured markdown renderer with complete styling"
  },
  {
    name: "MarkdownPreviewLight",
    description: "Lightweight markdown preview optimized for performance"
  },
  {
    name: "MarkdownModal",
    description: "Modal wrapper component for markdown editor"
  }
];

export default function MarkdownComponentsPage() {
  const [selectedComponent, setSelectedComponent] = React.useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = React.useState<string>('# Sample Markdown\n\nThis is **bold text** and this is *italic text*.\n\n- List item 1\n- List item 2\n- List item 3\n\n> This is a blockquote\n\n```javascript\nconst example = "code block";\nconsole.log(example);\n```\n\n[Link example](https://example.com)');

  const renderComponent = (component: any) => {
    try {
      switch (component.name) {
        case "MarkdownEditor":
          return (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Full MarkdownEditor with Lexical Framework
              </Typography>
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>
                <MarkdownEditor
                  value={markdownContent}
                  onChange={setMarkdownContent}
                  placeholder="Type your markdown here... Try **bold**, *italic*, # headings, - lists, > quotes, and ```code blocks```"
                  style={{ minHeight: "200px" }}
                />
              </Box>
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Real MarkdownEditor Features:</strong>
                <br />Lexical framework with rich text toolbar
                <br />Live markdown shortcuts (type ** for bold, # for headers)
                <br />Emoji picker and auto-linking
                <br />Full-screen editing mode
                <br />Plugin architecture for extensibility
              </Alert>
            </Box>
          );

        case "MarkdownPreview":
          return (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Full MarkdownPreview Renderer
              </Typography>
              <Box sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
                mb: 2,
                backgroundColor: "background.paper",
                minHeight: "150px"
              }}>
                <MarkdownPreview value={markdownContent} />
              </Box>
              <Alert severity="success">
                <strong>Real MarkdownPreview:</strong> Complete markdown parser with full styling, syntax highlighting, and advanced formatting support.
              </Alert>
            </Box>
          );

        case "MarkdownPreviewLight":
          return (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                MarkdownPreviewLight (Performance Optimized)
              </Typography>
              <Box sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
                mb: 2,
                backgroundColor: "background.paper",
                minHeight: "150px"
              }}>
                <MarkdownPreviewLight value={markdownContent} />
              </Box>
              <Alert severity="success">
                <strong>Real MarkdownPreviewLight:</strong> Lightweight renderer optimized for performance with essential formatting features.
              </Alert>
            </Box>
          );

        case "MarkdownModal":
          return (
            <Alert severity="info">
              <strong>MarkdownModal Demo</strong>
              <br />
              MarkdownModal wraps the MarkdownEditor in a modal dialog for inline editing workflows.
              <br /><br />
              <strong>Features:</strong> Modal overlay, save/cancel actions, fullscreen editing
              <br />
              <em>Note: Modal demo not shown to avoid interfering with playground navigation.</em>
            </Alert>
          );

        default:
          return (
            <Alert severity="info">
              <strong>{component.name} Demo</strong>
              <br />
              {component.description}
            </Alert>
          );
      }
    } catch (error) {
      return (
        <Alert severity="error">
          Error rendering {component.name}: {String(error)}
          <br />
          <em>This may indicate missing dependencies or configuration issues.</em>
        </Alert>
      );
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
            <Typography variant="subtitle2" gutterBottom>Demo:</Typography>
            <ErrorBoundary>
              {renderComponent(component)}
            </ErrorBoundary>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ComponentPage title="@churchapps/apphelper-markdown - Markdown Components">
      <Stack spacing={4}>
        <Alert severity="success">
          <strong>Live Markdown Components from @churchapps/apphelper-markdown Package</strong>
          <br />
          This page demonstrates all {markdownComponents.length} markdown components with fully functional Lexical-based editor and real-time previews. Edit content in the MarkdownEditor to see live updates in preview components!
        </Alert>

        <Box>
          <Typography variant="h5" gutterBottom>
            Markdown Components ({markdownComponents.length} total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Click Show Demo to see interactive markdown previews. Edit the content in MarkdownEditor to see live updates in preview components.
          </Alert>
          {markdownComponents.map(component => renderComponentCard(component))}
        </Box>

      </Stack>
    </ComponentPage>
  );
}
