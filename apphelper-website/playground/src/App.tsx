import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline, Container, Typography, Box, Card, CardContent, Stack } from "@mui/material";
import { CookiesProvider } from "react-cookie";
import { UserProvider } from "./UserContext";

import WebsiteComponentsPage from "./pages/WebsiteComponentsPage";

const theme = createTheme({
  palette: {
    mode: "light",
  },
  components: {
    MuiTextField: { styleOverrides: { root: { "& .MuiInputBase-root": { fontSize: "0.875rem" } } } },
    MuiFormControl: { styleOverrides: { root: { "& .MuiInputBase-root": { fontSize: "0.875rem" } } } },
    MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 8 } } }
  },
  typography: {
    fontSize: 14,
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
  },
  shape: { borderRadius: 8 }
});

function HomePage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          AppHelper Website Playground
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Test and preview website builder components from @churchapps/apphelper-website
        </Typography>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="h6" color="primary">@churchapps/apphelper-website</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Website builder elements: text, images, video, maps, calendars, drag-and-drop, and more
            </Typography>
            <Stack spacing={1}>
              <Link to="/website-components">Website Components</Link>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

function App() {
  return (
    <CookiesProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/website-components" element={<WebsiteComponentsPage />} />
            </Routes>
          </Router>
        </UserProvider>
      </ThemeProvider>
    </CookiesProvider>
  );
}

export default App;
