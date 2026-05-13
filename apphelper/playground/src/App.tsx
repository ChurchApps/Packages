import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline, Container, Typography, Box, Card, CardContent, Grid, Alert, Stack } from "@mui/material";
import { CookiesProvider } from "react-cookie";
import UserContext, { UserProvider } from "./UserContext";
import RequireAuth from "./components/RequireAuth";
import { SiteHeader, PageHeader } from "../../src";

// Import apphelper playground pages
import AppHelperHelpersPage from "./pages/AppHelperHelpersPage";
import AppHelperComponentsPage from "./pages/AppHelperComponentsPage";
import AppHelperWrappersPage from "./pages/AppHelperWrappersPage";
import AppHelperNotesPage from "./pages/AppHelperNotesPage";
import AppHelperDonationsPage from "./pages/AppHelperDonationsPage";
import AppHelperReportingPage from "./pages/AppHelperReportingPage";
import AppHelperHeadersPage from "./pages/AppHelperHeadersPage";
import AppHelperHooksPage from "./pages/AppHelperHooksPage";
import ModernLayoutPage from "./pages/ModernLayoutPage";
import { ComponentsTestPage } from "./pages/ComponentsPage";
import { ReportingTestPage } from "./pages/ReportingPage";
import PrivateMessageTestPage from "./pages/PrivateMessageTestPage";
import WebSocketTestPage from "./pages/WebSocketTestPage";
import PlaygroundLoginPage from "./login";

const theme = createTheme({
  palette: {
    mode: "light",
    InputBox: { headerText: "#333333" }
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
          AppHelper Playground
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Test and preview all exported components from @churchapps/apphelper
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Authentication Demo:</strong> Components marked with {"\uD83D\uDD12"} require login.
          <br />
          Add <code>?demo=true</code> to any URL for instant access.
        </Alert>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" color="primary">Core Components</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Helpers, UI Components, Modern Layout, Notes, Reporting, Hooks
                </Typography>
                <Stack spacing={1}>
                  <Link to="/apphelper-helpers">Helpers (Re-exported & Local)</Link>
                  <Link to="/apphelper-components">Core Components</Link>
                  <Link to="/modern-layout">Modern Layout (SiteHeader + PageHeader)</Link>
                  <Link to="/apphelper-headers">Header Components</Link>
                  <Link to="/apphelper-reporting">Reporting Components</Link>
                  <Link to="/apphelper-hooks">Hooks</Link>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" color="primary">Auth-Required Components {"\uD83D\uDD12"}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Wrapper and Notes components that require authentication
                </Typography>
                <Stack spacing={1}>
                  <Link to="/apphelper-wrappers">Wrapper Components {"\uD83D\uDD12"}</Link>
                  <Link to="/apphelper-notes">Notes Components {"\uD83D\uDD12"}</Link>
                  <Link to="/apphelper-donations">Donation Components {"\uD83D\uDD12"}</Link>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" color="primary">Testing & Debugging</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  WebSocket, private messaging, and legacy component tests
                </Typography>
                <Stack spacing={1}>
                  <Link to="/private-message-test">{"\uD83D\uDD27"} WebSocket & Private Message Testing</Link>
                  <Link to="/websocket-test">Simple WebSocket Test</Link>
                  <Link to="/components">Legacy Components Test</Link>
                  <Link to="/reporting">Legacy Reporting Test</Link>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}


function AppContent() {
  const context = React.useContext(UserContext);
  const navigate = useNavigate();

  const effectiveContext = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDemoMode = urlParams.get("demo") === "true";

    if (context?.user) {
      return context;
    }

    if (isDemoMode) {
      return {
        user: {
          id: "demo-user",
          firstName: "Demo",
          lastName: "User",
          email: "demo@churchapps.org"
        },
        person: {
          id: "demo-person",
          name: { display: "Demo User" },
          contactInfo: { email: "demo@churchapps.org" },
          photo: undefined
        },
        userChurch: {
          church: {
            id: "demo-church",
            name: "AppHelper Playground",
            address: { city: "Demo City", state: "DS" }
          },
          person: {
            id: "demo-person",
            roles: [],
            name: { display: "Demo User" },
            contactInfo: { email: "demo@churchapps.org" }
          },
          apis: [],
          jwt: "mock-jwt",
          groups: []
        },
        userChurches: [
          {
            church: {
              id: "demo-church",
              name: "AppHelper Playground",
              address: { city: "Demo City", state: "DS" }
            },
            person: {
              id: "demo-person",
              roles: [],
              name: { display: "Demo User" },
              contactInfo: { email: "demo@churchapps.org" }
            },
            apis: [],
            jwt: "mock-jwt",
            groups: []
          }
        ],
        logout: () => {
          console.log("Logout called");
        },
        setUser: () => {},
        setPerson: () => {},
        setUserChurch: () => {},
        setUserChurches: () => {}
      };
    }

    return context || {
        user: {
          id: "",
          email: "",
          firstName: "",
          lastName: ""
        },
        person: {
          id: "",
          name: { display: "" },
          contactInfo: { email: "" }
        },
        userChurch: {
          person: {
            id: "",
            name: { display: "" },
            contactInfo: { email: "" }
          },
          church: {
            id: "",
            name: "",
            address: { city: "", state: "" }
          },
          apis: [],
          jwt: "",
          groups: []
        },
        userChurches: [],
        setUser: () => {},
        setPerson: () => {},
        setUserChurch: () => {},
        setUserChurches: () => {}
      };
  }, [context]);

  const handleNavigate = (url: string) => {
    console.log("Navigation:", url);
    if (url.startsWith("/")) {
      navigate(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const primaryMenuItems = [
    { url: "/", icon: "home", label: "Home" },
    { url: "/apphelper-components", icon: "widgets", label: "Components" },
    { url: "/apphelper-helpers", icon: "build", label: "Helpers" },
    { url: "/apphelper-headers", icon: "view_quilt", label: "Headers" },
    { url: "/apphelper-reporting", icon: "analytics", label: "Reporting" },
    { url: "/apphelper-hooks", icon: "code", label: "Hooks" }
  ];

  const secondaryMenuItems = [
    { url: "/apphelper-components", label: "Components" },
    { url: "/apphelper-wrappers", label: "Wrappers" },
    { url: "/apphelper-notes", label: "Notes" },
    { url: "/modern-layout", label: "Modern Layout" },
    { url: "/private-message-test", label: "WebSocket Test" },
    { url: "/websocket-test", label: "Simple WebSocket Test" }
  ];

  return (
    <>
      <SiteHeader
        primaryMenuLabel="AppHelper"
        primaryMenuItems={primaryMenuItems}
        secondaryMenuLabel="Test Pages"
        secondaryMenuItems={secondaryMenuItems}
        context={effectiveContext}
        appName="PLAYGROUND"
        onNavigate={handleNavigate}
      />
      <PageHeader
        title="AppHelper Component Playground"
        subtitle="Test and preview all exported components from @churchapps/apphelper"
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* <Route path="/auth" element={<PlaygroundLoginPage />} /> */}
        <Route path="/login" element={<PlaygroundLoginPage />} />

        {/* Core apphelper pages */}
        <Route path="/apphelper-helpers" element={<AppHelperHelpersPage />} />
        <Route path="/apphelper-components" element={<AppHelperComponentsPage />} />
        <Route path="/apphelper-wrappers" element={<RequireAuth><AppHelperWrappersPage /></RequireAuth>} />
        <Route path="/apphelper-notes" element={<RequireAuth><AppHelperNotesPage /></RequireAuth>} />
        <Route path="/apphelper-donations" element={<AppHelperDonationsPage />} />
        <Route path="/apphelper-reporting" element={<AppHelperReportingPage />} />
        <Route path="/apphelper-headers" element={<AppHelperHeadersPage />} />
        <Route path="/apphelper-hooks" element={<AppHelperHooksPage />} />

        {/* Layout & testing */}
        <Route path="/modern-layout" element={<ModernLayoutPage />} />
        <Route path="/private-message-test" element={<PrivateMessageTestPage />} />
        <Route path="/websocket-test" element={<WebSocketTestPage />} />

        {/* Legacy routes */}
        <Route path="/components" element={<RequireAuth><ComponentsTestPage /></RequireAuth>} />
        <Route path="/reporting" element={<ReportingTestPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <CookiesProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserProvider>
          <Router>
            <AppContent />
          </Router>
        </UserProvider>
      </ThemeProvider>
    </CookiesProvider>
  );
}

export default App;
