import React from "react";
import { Container, Box, Typography, Button, Alert } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { LoginPage as AppHelperLoginPage } from "../../../src";
import { ApiHelper, UserHelper } from "@churchapps/apphelper";
import UserContext from "../UserContext";

function LoginPageComponent() {
  const context = React.useContext(UserContext) as any;
  const navigate = useNavigate();

  // Handle logout action on page load
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get("action");
    const returnUrl = urlParams.get("returnUrl") || "/";

    console.log("LoginPage loaded with URL params:", {
      action,
      returnUrl,
      fullUrl: window.location.href
    });

    if (action === "logout") {
      console.log("Logout action detected, logging out user...");
      console.log("Current context user:", context?.user);
      context?.logout();
      console.log("Logout called, redirecting to:", returnUrl);

      // Redirect back to the return URL after a short delay
      setTimeout(() => {
        navigate(returnUrl);
      }, 100);
    }
  }, [context, navigate]);

  const testApiConnection = async () => {
    console.log("Testing API connection...");
    console.log("Current URL:", window.location.href);
    console.log("URL Search params:", window.location.search);
    console.log("API Configs:", ApiHelper.apiConfigs);

    try {
      const config = ApiHelper.getConfig("MembershipApi");
      console.log("MembershipApi config:", config);

      if (!config) {
        console.error("MembershipApi config not found!");
        return;
      }

      // Test a simple API call
      const response = await fetch(config.url + "/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword"
        })
      });

      console.log("API response status:", response.status);
      const data = await response.text();
      console.log("API response:", data);

    } catch (error) {
      console.error("API test failed:", error);
    }
  };

  const handleLogout = () => {
    context?.logout();
  };

  // Extract JWT from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const jwtFromUrl = urlParams.get("jwt") || "";

  // If user is already logged in, show logout option
  if (context?.user) {
    return (
			<Container maxWidth="sm">
				<Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
					<Typography component="h1" variant="h4" gutterBottom>
						Welcome to AppHelper Playground
					</Typography>

					<Alert severity="success" sx={{ mb: 3, width: "100%" }}>
						<strong>You are logged in as:</strong>
						<br />
						Name: {context.person?.name?.display}
						<br />
						Email: {context.person?.contactInfo?.email}
						<br />
						Church: {context.userChurch?.church?.name}
					</Alert>

					<Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
						<Button
							component={Link}
							to="/"
							variant="contained"
							color="primary"
							fullWidth
							size="large"
						>
							Go to Playground
						</Button>

						<Button
							onClick={handleLogout}
							variant="outlined"
							color="secondary"
							fullWidth
							size="large"
						>
							Logout
						</Button>
					</Box>
				</Box>
			</Container>
    );
  }

  // Show real login only
  return (
		<Container maxWidth="sm">
			<Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
				<Typography component="h1" variant="h4" gutterBottom>
					AppHelper Playground Login
				</Typography>

				<Alert severity="info" sx={{ mb: 3, width: "100%" }}>
					<strong>Real Authentication</strong>
					<br />
					Login with your ChurchApps credentials to access the playground.
				</Alert>

				<Box sx={{ width: "100%" }}>

					<Box>
						<AppHelperLoginPage
							context={context}
							jwt={jwtFromUrl}
							auth=""
							appName="AppHelper Playground"
							appUrl={window.location.origin}
							returnUrl="/"
							showLogo={false}
							showFooter={true}
							loginContainerCssProps={{
							  style: {
							    backgroundColor: "transparent",
							    boxShadow: "none",
							    border: "none"
							  }
							}}
							handleRedirect={(url: string, user, person, userChurch, userChurches) => {
							  console.log("HandleRedirect called with parameters:", {
							    user,
							    person,
							    userChurch,
							    userChurches,
							    context: context ? "available" : "missing"
							  });

							  // Update the UserContext with the logged-in user data
							  if (user && context?.setUser) {
							    console.log("Setting user:", user);
							    context.setUser(user);
							    // Set UserHelper.user for permission checks
							    UserHelper.user = user;
							  }

							  // Create a proper person object from the user data
							  if (user && context?.setPerson) {
							    const personData = person || {
							      id: userChurch?.person?.id || "unknown",
							      name: { display: `${user.firstName} ${user.lastName}`.trim() || user.email },
							      contactInfo: { email: user.email },
							      membershipStatus: userChurch?.person?.membershipStatus || "Guest"
							    };
							    console.log("Setting person:", personData);
							    context.setPerson(personData);
							  }

							  if (userChurch && context?.setUserChurch) {
							    console.log("Setting userChurch:", userChurch);
							    context.setUserChurch(userChurch);

							    // Set the JWT in ApiHelper for authenticated requests
							    if (userChurch.jwt) {
							      // Set up UserHelper properly to enable permissions
							      UserHelper.currentUserChurch = userChurch;
							      UserHelper.setupApiHelper(userChurch);
							      ApiHelper.isAuthenticated = true;
							      console.log("Set ApiHelper authenticated with JWT and UserHelper permissions");
							    }
							  }

							  if (userChurches && context?.setUserChurches) {
							    console.log("Setting userChurches:", userChurches);
							    console.log("userChurches type:", typeof userChurches);
							    console.log("userChurches is array?", Array.isArray(userChurches));
							    console.log("userChurches[0]:", userChurches[0]);

							    // Check if userChurches is actually a single church object
							    if (!Array.isArray(userChurches) && (userChurches as any).id && (userChurches as any).name) {
							      console.error("ERROR: userChurches is a single church object, not an array!");
							      // Try to find the actual userChurches array
							      if (userChurch) {
							        console.log("Using userChurch to create single-item array");
							        context.setUserChurches([userChurch]);
							        // Set UserHelper.userChurches for permission checks
							        UserHelper.userChurches = [userChurch];
							      }
							    } else {
							      context.setUserChurches(userChurches);
							      // Set UserHelper.userChurches for permission checks
							      UserHelper.userChurches = userChurches;
							    }
							  }

							  const userName = person?.name?.display ||
									(user?.firstName && user?.lastName ?
									  `${user.firstName} ${user.lastName}` :
									  user?.email || "Unknown User");
							  const churchName = userChurch?.church?.name || "Unknown Church";

							  console.log(`Login Successful! User: ${userName}, Church: ${churchName}, Redirecting to: ${url}`);
							  console.log("Context after updates:", context);

							  // Navigate to the playground instead of reloading
							  navigate(url || "/");
							}}
						/>
					</Box>

					{/* Debug information */}
					<Box sx={{ mt: 2, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
						<Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 1 }}>
							Debug: Check browser console for API configuration details
						</Typography>
						<Button
							size="small"
							variant="outlined"
							onClick={testApiConnection}
							sx={{ fontSize: "0.75rem" }}
						>
							Test API Connection
						</Button>
					</Box>
				</Box>

				<Box sx={{ mt: 3, width: "100%" }}>
					<Typography variant="h6" gutterBottom>
						Understanding Authentication
					</Typography>
					<Typography variant="body2" color="textSecondary">
						Many AppHelper components require user authentication to function properly.
						Components like Notes, UserMenu, SupportModal, and donation forms need:
					</Typography>
					<ul style={{ marginTop: 8, paddingLeft: 16 }}>
						<li>User context with person and church information</li>
						<li>Permissions for accessing specific features</li>
						<li>API authentication for server communication</li>
					</ul>
				</Box>
			</Box>
		</Container>
  );
}

export default LoginPageComponent;
