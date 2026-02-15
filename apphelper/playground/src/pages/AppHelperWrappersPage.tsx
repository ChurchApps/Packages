import React from "react";
import { Container, Box, Typography, Alert, Stack, Card, CardContent } from "@mui/material";
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

export default function AppHelperWrappersPage() {
  return (
    <ComponentPage title="@churchapps/apphelper - Wrapper Components">
      <Stack spacing={4}>
        <Alert severity="info">
          <strong>Wrapper Components from @churchapps/apphelper Package</strong>
          <br />
          Components that were previously part of the SiteWrapper architecture. SiteWrapper has been deprecated in favor of modern layout components.
        </Alert>

        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Available Wrapper Components
            </Typography>

            <Typography variant="body1" paragraph>
              The wrapper package still contains several useful components:
            </Typography>

            <Box component="ul" sx={{ pl: 3 }}>
              <li><strong>NavItem</strong> - Navigation item component for building menus</li>
              <li><strong>AppList</strong> - List of available ChurchApps applications</li>
              <li><strong>ChurchList</strong> - Church selection and switching component</li>
              <li><strong>UserMenu</strong> - User profile menu with logout and settings</li>
              <li><strong>NewPrivateMessage</strong> - Private messaging interface</li>
              <li><strong>PrivateMessageDetails</strong> - Detailed message view component</li>
            </Box>

            <Alert severity="warning" sx={{ mt: 2, mb: 3 }}>
              <strong>Note:</strong> The SiteWrapper component has been removed from the package.
              Please see the <Link to="/modern-layout">Modern Layout page</Link> for the recommended SiteHeader + PageHeader architecture.
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Migration Guide</Typography>

            <Typography variant="body2" paragraph>
              If you were using SiteWrapper, migrate to the new architecture:
            </Typography>

            <Box sx={{
              backgroundColor: "#f5f5f5",
              p: 2,
              borderRadius: 1,
              fontFamily: "monospace",
              fontSize: "0.875rem",
              overflow: "auto"
            }}>
              <pre style={{ margin: 0 }}>{`// Old approach with SiteWrapper
<SiteWrapper navContent={...} context={...}>
  <YourContent />
</SiteWrapper>

// New approach with SiteHeader + PageHeader
<>
  <SiteHeader 
    primaryMenuItems={menuItems}
    context={context}
    appName="YourApp"
  />
  <PageHeader
    icon={<PersonIcon />}
    title="People"
    subtitle="Manage members"
  />
  <YourContent />
</>

// See the Modern Layout page for a complete working example`}</pre>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Individual Component Usage</Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>NavItem Example:</Typography>
            <Box sx={{
              backgroundColor: "#f5f5f5",
              p: 2,
              borderRadius: 1,
              fontFamily: "monospace",
              fontSize: "0.875rem",
              overflow: "auto"
            }}>
              <pre style={{ margin: 0 }}>{`<NavItem 
  url="/people" 
  label="People" 
  icon="person" 
  selected={currentPath === '/people'}
  onClick={() => navigate('/people')}
/>`}</pre>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </ComponentPage>
  );
}
