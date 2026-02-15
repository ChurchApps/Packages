import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline, Container, Typography, Box, Card, CardContent, Stack } from "@mui/material";
import { CookiesProvider } from "react-cookie";
import { UserProvider } from "./UserContext";

import DonationPage from "./pages/DonationPage";

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
          AppHelper Donations Playground
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Test and preview donation components from @churchapps/apphelper-donations
        </Typography>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="h6" color="primary">@churchapps/apphelper-donations</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Multi-gateway donation package with Stripe + PayPal support: Payment forms, recurring donations, fund management
            </Typography>
            <Stack spacing={1}>
              <Link to="/donations">All Donation Components</Link>
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
              <Route path="/donations" element={<DonationPage />} />
            </Routes>
          </Router>
        </UserProvider>
      </ThemeProvider>
    </CookiesProvider>
  );
}

export default App;
