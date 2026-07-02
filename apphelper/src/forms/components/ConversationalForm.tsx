"use client";

import React from "react";
import { Box, Button, LinearProgress, Link, Typography } from "@mui/material";
import { ErrorMessages } from "./ErrorMessages";
import { Locale } from "../helpers";
import { AnswerInterface, QuestionInterface } from "@churchapps/helpers";

interface Props {
  questions: QuestionInterface[];
  getAnswer: (questionId: string) => AnswerInterface | null;
  renderInput: (question: QuestionInterface) => React.ReactNode;
  errors: string[];
  setErrors: (errors: string[]) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

const singleLineTypes = [
  "Textbox", "Whole Number", "Decimal", "Date", "Phone Number", "Email", "Multiple Choice", "Yes/No"
];

export const ConversationalForm: React.FC<Props> = (props) => {
  const [step, setStep] = React.useState(0);
  const stepRef = React.useRef<HTMLDivElement>(null);
  const total = props.questions.length;
  const question = props.questions[step];
  const isLast = step === total - 1;

  React.useEffect(() => {
    const el = stepRef.current?.querySelector<HTMLElement>("input, textarea, select");
    el?.focus();
  }, [step]);

  const isAnswered = () => {
    if (!question?.required) return true;
    const answer = props.getAnswer(question.id || "");
    return !(answer === null || answer.value === null || answer.value === "");
  };

  const handleContinue = () => {
    if (!isAnswered()) {
      props.setErrors([(question.title || "Field") + " " + Locale.label("formSubmissionEdit.isRequired")]);
      return;
    }
    props.setErrors([]);
    if (isLast) props.onSubmit();
    else setStep((s) => Math.min(s + 1, total - 1));
  };

  const handleBack = () => {
    props.setErrors([]);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const canAdvance = question && singleLineTypes.indexOf(question.fieldType || "") > -1 && (e.target as HTMLElement)?.tagName !== "TEXTAREA";
    if (e.key === "Enter" && canAdvance) {
      e.preventDefault();
      handleContinue();
    }
  };

  if (!question) return null;

  const progress = ((step + 1) / total) * 100;

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", py: { xs: 2, sm: 4 } }} data-testid="conversational-form">
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 0.5, textAlign: "center", color: "text.secondary" }} data-testid="conversational-progress">
          {Locale.label("formSubmissionEdit.stepProgress").replace("{current}", String(step + 1)).replace("{total}", String(total))}
        </Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2 }} aria-label={Locale.label("formSubmissionEdit.stepProgress").replace("{current}", String(step + 1)).replace("{total}", String(total))} />
      </Box>

      <Box
        key={step}
        ref={stepRef}
        onKeyDown={handleKeyDown}
        sx={{
          animation: "conversationalStep 0.25s ease",
          "@keyframes conversationalStep": {
            from: { opacity: 0, transform: "translateY(12px)" },
            to: { opacity: 1, transform: "translateY(0)" }
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" }
        }}
      >
        <Typography component="h2" sx={{ mb: 2, textAlign: "center", fontWeight: 600, fontSize: { xs: "1.4rem", sm: "1.75rem" } }} data-testid="conversational-question">
          {question.title}
        </Typography>
        {question.fieldType !== "Heading" && (
          <Box sx={{ "& .MuiInputLabel-root": { display: "none" }, "& fieldset legend": { display: "none" } }}>
            {props.renderInput(question)}
          </Box>
        )}
      </Box>

      <ErrorMessages errors={props.errors} />

      <Box sx={{ mt: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
        <Button fullWidth variant="contained" size="large" disableElevation onClick={handleContinue} disabled={props.isSubmitting} data-testid="conversational-continue">
          {isLast ? Locale.label("formSubmissionEdit.submit") : Locale.label("formSubmissionEdit.continue")}
        </Button>
        {step > 0 && (
          <Link component="button" type="button" underline="hover" onClick={handleBack} sx={{ color: "text.secondary" }} data-testid="conversational-back">
            {Locale.label("formSubmissionEdit.back")}
          </Link>
        )}
      </Box>
    </Box>
  );
};
