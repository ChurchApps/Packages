import React from "react";
import { Container, Box, Typography, Alert, Stack, Button, Card, CardContent, Chip, TextField, Grid } from "@mui/material";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import {
  InputBox,
  HelpIcon,
  QuestionEdit,
  ErrorMessages,
  SmallButton,
  FormSubmissionEdit
} from "../../../src";
import { FormCardPayment } from "@churchapps/apphelper-donations";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

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

const formComponents = [
  {
    name: "InputBox",
    description: "Main container for form inputs with header, save/cancel buttons",
    category: "Container",
    complexity: "Low"
  },
  {
    name: "QuestionEdit",
    description: "Dynamic form input based on question type (text, select, checkbox, etc.)",
    category: "Input",
    complexity: "Medium"
  },
  {
    name: "FormSubmissionEdit",
    description: "Complete form for editing form submissions with payment support",
    category: "Form",
    complexity: "High"
  },
  {
    name: "ErrorMessages",
    description: "Display validation errors in a consistent format",
    category: "Display",
    complexity: "Low"
  },
  {
    name: "HelpIcon",
    description: "Help icon with popup information",
    category: "Helper",
    complexity: "Low"
  },
  {
    name: "SmallButton",
    description: "Compact button component for UI actions",
    category: "Button",
    complexity: "Low"
  }
];

export default function FormsComponentsPage() {
  const [selectedComponent, setSelectedComponent] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    textValue: "",
    selectValue: "",
    emailValue: "",
    errors: [] as string[]
  });

  // Mock Stripe setup
  const stripePromise = React.useMemo(() => loadStripe("pk_test_dummy_key_for_demo") as Promise<any>, []);

  // Mock form data
  const mockQuestion = {
    id: "question-1",
    title: "Sample Text Question",
    fieldType: "Textbox",
    placeholder: "Enter your response...",
    required: true
  };

  const mockSelectQuestion = {
    id: "question-2",
    title: "Sample Multiple Choice",
    fieldType: "Multiple Choice",
    choices: [{ text: "Option 1", value: "opt1" }] as [{ value?: string; text?: string }],
    required: false
  };

  const mockPaymentQuestion = {
    id: "question-3",
    title: "Payment Question",
    fieldType: "Payment",
    choices: [{ text: "Amount", value: "25.00" }] as [{ value?: string; text?: string }],
    required: true
  };

  const mockAnswer = {
    questionId: mockQuestion.id,
    value: formData.textValue
  };

  const mockSelectAnswer = {
    questionId: mockSelectQuestion.id,
    value: formData.selectValue
  };

  const handleQuestionChange = (questionId: string, value: string) => {
    if (questionId === mockQuestion.id) {
      setFormData(prev => ({ ...prev, textValue: value }));
    } else if (questionId === mockSelectQuestion.id) {
      setFormData(prev => ({ ...prev, selectValue: value }));
    }
  };

  const handleSaveExample = () => {
    const errors: string[] = [];
    if (!formData.textValue) errors.push("Text field is required");
    if (!formData.emailValue) errors.push("Email is required");

    setFormData(prev => ({ ...prev, errors }));

    if (errors.length === 0) {
      alert("Form saved successfully!");
    }
  };

  const renderComponent = (component: any) => {
    try {
      switch (component.name) {
        case "InputBox":
          return (
            <InputBox
              headerIcon="edit"
              headerText="Sample Form"
              saveFunction={handleSaveExample}
              cancelFunction={() => console.log("Cancelled")}
              saveText="Save Form"
            >
              <TextField
                fullWidth
                label="Sample Input"
                value={formData.textValue}
                onChange={(e) => setFormData(prev => ({ ...prev, textValue: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email Input"
                type="email"
                value={formData.emailValue}
                onChange={(e) => setFormData(prev => ({ ...prev, emailValue: e.target.value }))}
              />
            </InputBox>
          );

        case "QuestionEdit":
          return (
            <Stack spacing={3}>
              <QuestionEdit
                question={mockQuestion}
                answer={mockAnswer}
                changeFunction={handleQuestionChange}
              />
              <QuestionEdit
                question={mockSelectQuestion}
                answer={mockSelectAnswer}
                changeFunction={handleQuestionChange}
              />
              <QuestionEdit
                question={mockPaymentQuestion}
                answer={{ questionId: mockPaymentQuestion.id, value: "" }}
                changeFunction={handleQuestionChange}
                onPaymentRequired={(question: any) => (
                  <Elements stripe={stripePromise}>
                    <FormCardPayment churchId="demo-church" question={question} />
                  </Elements>
                )}
              />
            </Stack>
          );

        case "FormSubmissionEdit":
          return (
            <FormSubmissionEdit
              addFormId="demo-form"
              contentType="demo"
              contentId="demo-content"
              formSubmissionId=""
              churchId="demo-church"
              updatedFunction={() => console.log("Form submission updated")}
              cancelFunction={() => console.log("Form submission cancelled")}
              stripePromise={stripePromise}
              FormCardPaymentComponent={FormCardPayment}
            />
          );

        case "ErrorMessages":
          return (
            <ErrorMessages errors={formData.errors.length ? formData.errors : ["Sample error message", "Another validation error"]} />
          );

        case "HelpIcon":
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography>Form Field Label</Typography>
              <HelpIcon article="forms/field-help" />
            </Box>
          );

        case "SmallButton":
          return (
            <Stack direction="row" spacing={1}>
              <SmallButton icon="edit" text="Primary" onClick={() => alert("Primary action")} />
              <SmallButton icon="delete" text="Secondary" onClick={() => alert("Secondary action")} color="secondary" />
            </Stack>
          );

        default:
          return (
            <Alert severity="info">
              <strong>{component.name} Demo</strong>
              <br />
              {component.description}
              <br /><br />
              Component demo implementation not yet available.
            </Alert>
          );
      }
    } catch (error) {
      return (
        <Alert severity="error">
          <strong>Error loading {component.name}</strong>
          <br />
          {error instanceof Error ? error.message : "Unknown error occurred"}
          <br /><br />
          This component may require additional configuration or dependencies.
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
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip label={component.category} color="primary" variant="outlined" size="small" />
            <Chip
              label={component.complexity}
              color={component.complexity === "High" ? "error" : component.complexity === "Medium" ? "warning" : "success"}
              variant="outlined"
              size="small"
            />
            <Button
              variant={selectedComponent === component.name ? "contained" : "outlined"}
              size="small"
              onClick={() => setSelectedComponent(selectedComponent === component.name ? null : component.name)}
            >
              {selectedComponent === component.name ? "Hide" : "Show"} Demo
            </Button>
          </Box>
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
            <Typography variant="subtitle2" gutterBottom>Live Component Demo:</Typography>
            <ErrorBoundary>
              {renderComponent(component)}
            </ErrorBoundary>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ComponentPage title="@churchapps/apphelper-forms - Form Components">
      <Stack spacing={4}>
        <Alert severity="info">
          <strong>Form Components from @churchapps/apphelper-forms Package</strong>
          <br />
          This page demonstrates form components that provide input handling, validation, and form submission capabilities.
          Payment functionality is provided through integration with @churchapps/apphelper-donations.
        </Alert>

        <Alert severity="success">
          <strong>Package Separation Success!</strong>
          <br />
          Form components are now separated from payment processing. Only @churchapps/apphelper-donations contains Stripe dependencies.
        </Alert>

        <Box>
          <Typography variant="h5" gutterBottom>
            Form Components ({formComponents.length} total)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Click "Show Demo" to see live component demonstrations with interactive examples.
          </Alert>
          {formComponents.map(component => renderComponentCard(component))}
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>Package Architecture</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>@churchapps/apphelper-forms</Typography>
                  <Typography variant="body2">
                    Contains general form components<br/>
                    No Stripe dependencies<br/>
                    Supports payment integration via callbacks<br/>
                    Reusable across different payment providers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>@churchapps/apphelper-donations</Typography>
                  <Typography variant="body2">
                    Contains Stripe-specific components<br/>
                    All payment processing logic<br/>
                    Used by forms package for payments<br/>
                    Maintains security isolation
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Stack>
    </ComponentPage>
  );
}
