import React from "react";
import { Box, Typography, Alert, Stack, Button, Paper } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import {
  Banner,
  PageHeader
} from "../../../src";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

export default function ModernLayoutPage() {
  const [currentSection, setCurrentSection] = React.useState("people");

  // Add responsive CSS for proper mobile behavior
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      /* Mobile styles (≤740px) - hide horizontal secondary menu */
      @media (max-width: 740px) {
        #secondaryMenu { display: none !important; }
      }
      
      /* Desktop styles (≥741px) - hide mobile dropdown secondary menu */
      @media (min-width: 741px) {
        #secondaryMenuAlt { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);


  const getSectionConfig = () => {
    switch (currentSection) {
      case "people":
        return {
          primaryLabel: "People",
          secondaryLabel: "People",
          secondaryItems: [
            { url: "/people", label: "People" },
            { url: "/groups", label: "Groups" },
            { url: "/attendance", label: "Attendance" }
          ],
          pageHeader: {
            icon: <PersonIcon />,
            title: "People",
            subtitle: "Manage your church members and visitors",
            statistics: [
              { icon: <PersonIcon />, value: "248", label: "Active Members" },
              { icon: <GroupIcon />, value: "12", label: "Groups" },
              { icon: <PersonIcon />, value: "89%", label: "Attendance Rate" }
            ],
            actions: (
							<>
								<Button
									variant="contained"
									startIcon={<AddIcon />}
									sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
								>
									Add Person
								</Button>
								<Button
									variant="outlined"
									startIcon={<FileDownloadIcon />}
									sx={{ borderColor: "rgba(255,255,255,0.5)", color: "#FFF", "&:hover": { borderColor: "#FFF" } }}
								>
									Export
								</Button>
							</>
            )
          }
        };

      case "donations":
        return {
          primaryLabel: "Donations",
          secondaryLabel: "Summary",
          secondaryItems: [
            { url: "/donations", label: "Summary" },
            { url: "/donations/batches", label: "Batches" },
            { url: "/donations/funds", label: "Funds" }
          ],
          pageHeader: {
            icon: <VolunteerActivismIcon />,
            title: "Donations",
            subtitle: "Track and manage donations and giving",
            statistics: [
              { icon: <VolunteerActivismIcon />, value: "$12,450", label: "This Month" },
              { icon: <PersonIcon />, value: "89", label: "Donors" },
              { icon: <GroupIcon />, value: "+15%", label: "vs Last Month" }
            ],
            actions: (
							<>
								<Button
									variant="contained"
									startIcon={<AddIcon />}
									sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
								>
									New Donation
								</Button>
								<Button
									variant="outlined"
									sx={{ borderColor: "rgba(255,255,255,0.5)", color: "#FFF", "&:hover": { borderColor: "#FFF" } }}
								>
									Reports
								</Button>
							</>
            )
          }
        };

      case "serving":
        return {
          primaryLabel: "Serving",
          secondaryLabel: "Plans",
          secondaryItems: [
            { url: "/plans", label: "Plans" },
            { url: "/plans/songs", label: "Songs" },
            { url: "/tasks", label: "Tasks" }
          ],
          pageHeader: {
            icon: <AssignmentIcon />,
            title: "Service Plans",
            subtitle: "Manage worship services and team assignments",
            statistics: [
              { icon: <AssignmentIcon />, value: "4", label: "Active Plans" },
              { icon: <PersonIcon />, value: "23", label: "Team Members" },
              { icon: <GroupIcon />, value: "8", label: "This Week" }
            ],
            actions: (
							<>
								<Button
									variant="contained"
									startIcon={<AddIcon />}
									sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
								>
									New Plan
								</Button>
							</>
            )
          }
        };

      default:
        return {
          primaryLabel: "People",
          secondaryLabel: "People",
          secondaryItems: [
            { url: "/people", label: "People" },
            { url: "/groups", label: "Groups" },
            { url: "/attendance", label: "Attendance" }
          ],
          pageHeader: {
            icon: <PersonIcon />,
            title: "People",
            subtitle: "Manage your church members and visitors",
            statistics: [],
            actions: null
          }
        };
    }
  };

  const sectionConfig = getSectionConfig();

  return (
		<Box sx={{ width: "100%" }}>
			<Box sx={{ mt: 2, mb: 2, px: 3 }}>
				<Link to="/">← Back to Home</Link>
				<Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
					Modern Layout Components
				</Typography>
				<ErrorBoundary>
					<Box sx={{ mt: 3 }}>
						<Stack spacing={4}>
							<Alert severity="info">
								<strong>SiteHeader + PageHeader Integration</strong>
								<br />
								This demonstrates the recommended modern layout using SiteHeader for navigation
								combined with PageHeader for page-level information and actions.
							</Alert>

							<Box>
								<Typography variant="h6" gutterBottom>Quick Section Switch</Typography>
								<Stack direction="row" spacing={1} sx={{ mb: 3 }}>
									{[
									  { key: "people", label: "People", icon: "👥" },
									  { key: "donations", label: "Donations", icon: "💰" },
									  { key: "serving", label: "Serving", icon: "🎵" }
									].map((section) => (
										<Button
											key={section.key}
											variant={currentSection === section.key ? "contained" : "outlined"}
											onClick={() => setCurrentSection(section.key)}
											size="small"
										>
											{section.icon} {section.label}
										</Button>
									))}
								</Stack>
							</Box>

							<Box>
								<Typography variant="h6" gutterBottom>Live Demo - {sectionConfig.pageHeader.title} Section</Typography>
								<Box sx={{ overflow: "hidden", mb: 2 }}>
									<div style={{
									  "--c1": "#1565C0",
									  "--c1d1": "#1358AD",
									  "--c1d2": "#114A99",
									  "--c1l2": "#1976d2"
									} as React.CSSProperties}>

										<PageHeader
											icon={sectionConfig.pageHeader.icon}
											title={sectionConfig.pageHeader.title}
											subtitle={sectionConfig.pageHeader.subtitle}
											statistics={sectionConfig.pageHeader.statistics}
										>
											{sectionConfig.pageHeader.actions}
										</PageHeader>
									</div>

									{/* Demo content area */}
									<Box sx={{ p: 3, minHeight: "200px", bgcolor: "#f5f5f5" }}>
										<Typography variant="h6" gutterBottom>
											Main Content Area - {sectionConfig.pageHeader.title}
										</Typography>
										<Typography variant="body1" paragraph>
											This is where the main {sectionConfig.pageHeader.title.toLowerCase()} content would appear.
											The SiteHeader provides consistent navigation while the PageHeader gives context
											and actions specific to this section.
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Try clicking the section buttons above or using the navigation menus to see
											how the PageHeader content changes dynamically while maintaining the same
											navigation structure.
										</Typography>
									</Box>
								</Box>

								<Alert severity="success" sx={{ mb: 2 }}>
									<strong>Features Demonstrated:</strong>
									<br />• Dynamic section switching with contextual PageHeader content
									<br />• SiteHeader with B1Admin's darker blue color scheme (#1565C0)
									<br />• Selected state badge in secondary menu (darker blue #114A99)
									<br />• Responsive behavior: secondary menu hidden on mobile, shown in dropdown
									<br />• PageHeader with statistics, actions, and theming
									<br />• User menu with church switching and profile options
									<br />• Support drawer with context-aware help articles
								</Alert>
							</Box>

							<Box>
								<Typography variant="h6" gutterBottom>Individual Component Demos</Typography>

								<Stack spacing={3}>
									<Box>
										<Typography variant="subtitle1" gutterBottom>Banner Component</Typography>
										<Paper elevation={1} sx={{ p: 2, bgcolor: "primary.main", color: "primary.contrastText" }}>
											<Banner>
												<Typography variant="h6" align="center">
													Welcome to Demo Church
												</Typography>
												<Typography variant="body2" align="center" sx={{ mt: 1 }}>
													123 Main St, Demo City, DS 12345 | www.demo-church.org
												</Typography>
											</Banner>
										</Paper>
									</Box>

									<Box>
										<Typography variant="subtitle1" gutterBottom>Standalone PageHeader</Typography>
										<Box sx={{ overflow: "hidden" }}>
											<Box sx={{ "& .MuiBox-root:first-child": { marginTop: 0 } }}>
												<div style={{ "--c1l2": "#568BDA" } as React.CSSProperties}>
													<PageHeader
														icon={<GroupIcon />}
														title="Group Management"
														subtitle="Organize and manage your small groups"
														statistics={[
														  { icon: <GroupIcon />, value: "12", label: "Active Groups" },
														  { icon: <PersonIcon />, value: "156", label: "Members" }
														]}
													>
														<Button
															variant="contained"
															size="small"
															sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
														>
															Add Group
														</Button>
													</PageHeader>
												</div>
											</Box>
										</Box>
									</Box>
								</Stack>
							</Box>

							<Box>
								<Typography variant="h6" gutterBottom>Architecture Benefits</Typography>
								<Stack spacing={2}>
									<Alert severity="info">
										<strong>SiteHeader Benefits:</strong>
										<br />• Consistent navigation across all pages
										<br />• Context-aware support articles
										<br />• User and church management integration
										<br />• Responsive mobile-friendly design
									</Alert>

									<Alert severity="success">
										<strong>PageHeader Benefits:</strong>
										<br />• Page-specific identity with icon and title
										<br />• Statistics display for key metrics
										<br />• Action buttons contextual to the page
										<br />• Easy theming with CSS custom properties
									</Alert>

									<Alert severity="warning">
										<strong>Migration from SiteWrapper:</strong>
										<br />• More modular and maintainable architecture
										<br />• Better separation of navigation vs page content
										<br />• Easier to customize individual pages
										<br />• Improved performance and bundle splitting
									</Alert>
								</Stack>
							</Box>
						</Stack>
					</Box>
				</ErrorBoundary>
			</Box>
		</Box>
  );
}
