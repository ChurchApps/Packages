import React, { useState } from "react";
import { Container, Box, Typography, Alert, Stack, Button, Card, CardContent, Chip, Grid, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import { HtmlEditor, HtmlModal } from "../../../src";

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

const htmlComponents = [
  {
    name: "HtmlEditor",
    description: "Rich text editor built on Lexical framework with full HTML output and color support",
    category: "Editor",
    complexity: "High",
    features: ["Text formatting", "Colors", "Lists", "Links", "Tables", "Headings"]
  },
  {
    name: "HtmlModal",
    description: "Modal wrapper component for HTML editor with edit/preview tabs",
    category: "Modal",
    complexity: "Medium",
    features: ["Edit/Preview tabs", "Modal dialog", "Save/Cancel actions"]
  }
];

export function HtmlComponentsPage() {
  const [selectedComponent, setSelectedComponent] = useState("HtmlEditor");
  const [htmlContent, setHtmlContent] = useState('<h2>Welcome to the HTML Editor!</h2><p>This editor supports <strong>bold text</strong>, <em>italic text</em>, <u>underlined text</u>, and <span style="color: #ff6b6b;">colored text</span>!</p><ul><li>Bullet lists</li><li>Numbered lists</li><li>Check lists</li></ul><blockquote>Blockquotes for important information</blockquote><p>You can also create <a href="https://example.com" class="btn btn-primary btn-medium">links</a> and much more!</p>');
  const [modalOpen, setModalOpen] = useState(false);
  const [htmlDialogOpen, setHtmlDialogOpen] = useState(false);

  const renderComponent = () => {
    switch (selectedComponent) {
      case "HtmlEditor":
        return (
          <Stack spacing={2}>
            <Alert severity="info">
              <strong>Full HtmlEditor with Lexical Framework</strong>
            </Alert>
            <Paper sx={{ p: 2, height: 400 }}>
              <HtmlEditor
                value={htmlContent}
                onChange={(html) => {
                  console.log("HTML Editor onChange called with:", html);
                  setHtmlContent(html);
                }}
                placeholder="Start typing with full formatting support..."
              />
            </Paper>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setHtmlDialogOpen(true)}
              >
                Get HTML
              </Button>
              <Typography variant="body2" color="text.secondary">
                Click to view the current HTML content with all your changes
              </Typography>
              <Typography variant="caption" color="info.main">
                ({htmlContent.length} characters)
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Live HTML Preview:</strong> {htmlContent.substring(0, 100)}...
              </Typography>
            </Alert>

            <Typography variant="subtitle2" gutterBottom>
              <strong>Real HtmlEditor Features:</strong>
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[
                "Bold/Italic/Underline", "Text Colors", "Background Colors", "Headings", "Lists", "Links", "Tables", "Code", "Quotes", "Alignment"
              ].map((feature) => (
                <Chip key={feature} label={feature} size="small" color="primary" variant="outlined" />
              ))}
            </Stack>
          </Stack>
        );

      case "HtmlModal":
        return (
          <Stack spacing={2}>
            <Alert severity="info">
              HtmlModal wraps the HtmlEditor in a modal dialog for inline editing workflows.
            </Alert>
            <Box>
              <Button
                variant="contained"
                onClick={() => setModalOpen(true)}
                sx={{ mb: 2 }}
              >
                Open HTML Editor Modal
              </Button>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="h6" gutterBottom>Current HTML Content:</Typography>
                <Box
                  sx={{ maxHeight: "200px", overflow: "auto", mt: 1 }}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </Paper>
            </Box>
            <HtmlModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Edit HTML Content"
              value={htmlContent}
              onChange={setHtmlContent}
              onSave={(html) => setHtmlContent(html)}
            />
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <ComponentPage title="HTML Components">
      <Alert severity="info" sx={{ mb: 3 }}>
        This page demonstrates all {htmlComponents.length} HTML components with fully functional Lexical-based editor.
        Edit content in the HtmlEditor to see live updates!
      </Alert>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Components</Typography>
              <Stack spacing={1}>
                {htmlComponents.map((component) => (
                  <Button
                    key={component.name}
                    variant={selectedComponent === component.name ? "contained" : "outlined"}
                    onClick={() => setSelectedComponent(component.name)}
                    size="small"
                    fullWidth
                    sx={{ justifyContent: "flex-start" }}
                  >
                    {component.name}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Component Info</Typography>
              {(() => {
                const component = htmlComponents.find(c => c.name === selectedComponent);
                return component ? (
                  <Stack spacing={1}>
                    <Typography variant="body2">{component.description}</Typography>
                    <Box>
                      <Chip label={component.category} size="small" color="primary" />
                      <Chip label={component.complexity} size="small" color="secondary" sx={{ ml: 1 }} />
                    </Box>
                    {component.features && (
                      <Box>
                        <Typography variant="caption" display="block" sx={{ fontWeight: "bold", mt: 1 }}>Features:</Typography>
                        {component.features.map((feature, index) => (
                          <Chip key={index} label={feature} size="small" variant="outlined" sx={{ mr: 0.5, mt: 0.5 }} />
                        ))}
                      </Box>
                    )}
                  </Stack>
                ) : null;
              })()}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 9 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>{selectedComponent}</Typography>
              {renderComponent()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Usage Instructions</Typography>
          <Typography variant="body2" paragraph>
            Select components to see interactive demos. Edit content in the HtmlEditor and use the HtmlModal for inline editing workflows.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Chip label="HTML Output" color="primary" />
            <Chip label="Full Formatting" color="secondary" />
            <Chip label="Color Support" color="success" />
            <Chip label="Sanitization" color="warning" />
            <Chip label="Lexical Framework" color="info" />
          </Stack>
        </CardContent>
      </Card>

      {/* HTML Content Dialog */}
      <Dialog
        open={htmlDialogOpen}
        onClose={() => setHtmlDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Current HTML Content
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This is the raw HTML generated by your editor changes:
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={15}
            variant="outlined"
            value={htmlContent}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: "monospace", fontSize: "0.875rem" }
            }}
            sx={{ mt: 1 }}
          />

          <Box sx={{ mt: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Preview:
            </Typography>
            <Box
              sx={{
                maxHeight: "200px",
                overflow: "auto",
                p: 1,
                bgcolor: "grey.50",
                borderRadius: 1
              }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(htmlContent)} variant="outlined">
            Copy to Clipboard
          </Button>
          <Button onClick={() => setHtmlDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ComponentPage>
  );
}
