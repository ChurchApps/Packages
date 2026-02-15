import React from "react";
import { Container, Box, Typography, Alert, Stack, Button, Card, CardContent } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import UserContext from "../UserContext";
import {
  ErrorMessages,
  ExportLink,
  DisplayBox,
  FloatingSupport,
  FormSubmissionEdit,
  GalleryModal,
  HelpIcon,
  ImageEditor,
  InputBox,
  Loading,
  QuestionEdit,
  SmallButton,
  SupportModal
} from "../../../src";

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

const coreComponents = [
  {
    name: "ErrorMessages",
    component: ErrorMessages,
    description: "Component for displaying error messages with dismiss functionality",
    props: { errors: ["Sample error message", "Another error occurred"] }
  },
  {
    name: "Loading",
    component: Loading,
    description: "Loading spinner component",
    props: {}
  },
  {
    name: "SmallButton",
    component: SmallButton,
    description: "Compact button component with icon support",
    props: { icon: "save", text: "Save", onClick: () => console.log("SmallButton clicked") }
  },
  {
    name: "DisplayBox",
    component: DisplayBox,
    description: "Container component with header, icon, and help text",
    props: {
      headerText: "Sample Data Display",
      headerIcon: "people",
      help: "This is a sample display box",
      children: "Content inside DisplayBox"
    }
  },
  {
    name: "InputBox",
    component: InputBox,
    description: "Enhanced input container with save/cancel functionality",
    props: {
      headerText: "Edit Information",
      headerIcon: "edit",
      saveFunction: () => console.log("InputBox save"),
      cancelFunction: () => console.log("InputBox cancel"),
      children: "Input fields go here"
    }
  },
  {
    name: "ExportLink",
    component: ExportLink,
    description: "Link component for data export functionality",
    props: { data: [{ id: 1, name: "Sample" }], filename: "sample-export", text: "Export Data" }
  },
  {
    name: "ImageEditor",
    component: ImageEditor,
    description: "Image editing and cropping component",
    props: {
      photoUrl: "",
      aspectRatio: 1,
      onUpdate: (dataUrl: string) => console.log("Image updated:", dataUrl)
    }
  },
  {
    name: "FormSubmissionEdit",
    component: FormSubmissionEdit,
    description: "Component for editing form submissions",
    props: {
      formSubmission: { id: 1, data: {} },
      onSave: (submission: any) => console.log("Form submission saved:", submission)
    }
  },
  {
    name: "FloatingSupport",
    component: FloatingSupport,
    description: "Floating support button component",
    props: { appName: "Playground" }
  },
  {
    name: "HelpIcon",
    component: HelpIcon,
    description: "Icon with tooltip help text",
    props: { text: "This is helpful information displayed in a tooltip" }
  },
  {
    name: "QuestionEdit",
    component: QuestionEdit,
    description: "Component for editing form questions",
    props: {
      question: { id: 1, title: "Sample Question", questionType: "Text" },
      onSave: (question: any) => console.log("Question saved:", question)
    }
  },
  {
    name: "SupportModal",
    component: SupportModal,
    description: "Modal component for support functionality",
    props: {
      show: true,
      onHide: () => console.log("Support modal hidden"),
      appName: "Playground"
    }
  },
  {
    name: "GalleryModal",
    component: GalleryModal,
    description: "Modal component for selecting photos from gallery, uploading new images, or choosing stock photos",
    props: {
      aspectRatio: 1.78,
      onClose: () => console.log("Gallery modal closed"),
      onSelect: (img: string) => console.log("Image selected:", img),
      contentRoot: "https://content.churchapps.org"
    }
  }
];

export default function AppHelperComponentsPage() {
  const context = React.useContext(UserContext);
  const [selectedComponent, setSelectedComponent] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string>("https://via.placeholder.com/300x300/4CAF50/ffffff?text=Click+to+Edit");
  const [isEditingImage, setIsEditingImage] = React.useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = React.useState<boolean>(false);

  const handleError = () => {
    setErrors(["Sample error message", "Another error occurred", "Validation failed"]);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const renderComponent = (component: any) => {
    const Component = component.component;

    // Handle special cases
    if (component.name === "ErrorMessages") {
      return <ErrorMessages errors={errors} />;
    }

    if (component.name === "SupportModal") {
      return (
				<Alert severity="info">
					SupportModal component would appear here with proper props configuration.
				</Alert>
      );
    }

    if (component.name === "GalleryModal") {
      console.log("APIs", context?.userChurch.apis);
      return (
				<Box sx={{ textAlign: "center" }}>
					<Button
						variant="contained"
						onClick={() => setShowGalleryModal(true)}
						sx={{ mb: 2 }}
					>
						Open Gallery Modal
					</Button>
					<Typography variant="body2" color="textSecondary">
						Click to see the GalleryModal component in action
					</Typography>
					{showGalleryModal && (
						<GalleryModal
							aspectRatio={1.78}
							onClose={() => setShowGalleryModal(false)}
							onSelect={(img: string) => {
							  console.log("Image selected:", img);
							  setShowGalleryModal(false);
							  alert("Image selected: " + img);
							}}
						/>
					)}
				</Box>
      );
    }

    if (component.name === "ImageEditor") {
      if (isEditingImage) {
        return (
					<ImageEditor
						photoUrl={currentImageUrl}
						aspectRatio={1}
						onUpdate={(dataUrl?: string) => {
						  if (dataUrl) {
						    setCurrentImageUrl(dataUrl);
						  }
						  setIsEditingImage(false);
						}}
						onCancel={() => setIsEditingImage(false)}
					/>
        );
      }

      return (
				<Box sx={{ textAlign: "center" }}>
					<Typography variant="subtitle2" sx={{ mb: 2 }}>Click the image below to edit it:</Typography>
					<Box
						component="img"
						src={currentImageUrl}
						alt="Click to edit"
						sx={{
						  width: 300,
						  height: 300,
						  objectFit: "cover",
						  cursor: "pointer",
						  borderRadius: 2,
						  boxShadow: 2,
						  transition: "transform 0.2s",
						  "&:hover": {
						    transform: "scale(1.05)",
						    boxShadow: 4
						  }
						}}
						onClick={() => setIsEditingImage(true)}
					/>
					<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Current image preview</Typography>
				</Box>
      );
    }

    try {
      return <Component {...component.props} />;
    } catch (error) {
      return (
				<Alert severity="error">
					Error rendering {component.name}: {String(error)}
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
					  mt: 2,
					  minHeight: component.name === "Loading" ? 100 : "auto"
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
		<ComponentPage title="@churchapps/apphelper - Core Components">
			<Stack spacing={4}>
				<Alert severity="info">
					<strong>Core UI Components from @churchapps/apphelper Package</strong>
					<br />
					This page demonstrates all {coreComponents.length} core UI components with interactive examples and real usage data from the usage report.
				</Alert>

				<Box>
					<Typography variant="h5" gutterBottom>Interactive Controls</Typography>
					<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
						<Button onClick={handleError} variant="outlined">
							Generate Sample Errors
						</Button>
						<Button onClick={clearErrors} variant="outlined">
							Clear Errors
						</Button>
						<Button onClick={() => console.log("SupportModal demo")} variant="outlined">
							Show SupportModal
						</Button>
					</Stack>
				</Box>

				<Box>
					<Typography variant="h5" gutterBottom>
						Core Components ({coreComponents.length} total)
					</Typography>
					<Alert severity="info" sx={{ mb: 2 }}>
						Click "Show Demo" on any component card to see a live interactive example.
					</Alert>
					{coreComponents.map(component => renderComponentCard(component))}
				</Box>

				{context?.user && (
					<FloatingSupport appName="Playground" />
				)}
			</Stack>
		</ComponentPage>
  );
}
