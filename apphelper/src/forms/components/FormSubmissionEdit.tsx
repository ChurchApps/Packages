"use client";

/// <reference types="react" />
import React, { useCallback, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Box } from "@mui/material";
import { ErrorMessages, InputBox, QuestionEdit } from "./";
import { ConversationalForm } from "./ConversationalForm";
import { Locale, QuestionVisibility } from "../helpers";
import { AnswerInterface, FormSubmissionInterface, QuestionInterface } from "@churchapps/helpers";
import { ApiHelper, UniqueIdHelper } from "../..";
import { FormPaymentQuestion } from "../../donations/components/FormPaymentQuestion";
import { GuestCaptcha } from "../../donations/helpers/GuestCaptcha";

interface Props {
	addFormId: string,
	contentType: string,
	contentId: string,
	formSubmissionId: string,
	unRestrictedFormId?: string,
	personId?: string,
	churchId?: string,
	showHeader?: boolean,
	noBackground?: boolean,
	displayMode?: "standard" | "conversational",
	updatedFunction: (formSubmission?: FormSubmissionInterface) => void,
	cancelFunction?: () => void
}

export const FormSubmissionEdit: React.FC<Props> = ({ showHeader = true, noBackground = false, ...props }) => {
  const [formSubmission, setFormSubmission] = React.useState<FormSubmissionInterface | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const paymentRef = useRef<any>(null);
  const [paymentShown, setPaymentShown] = React.useState(false);
  const setPaymentHandle = useCallback((handle: any) => { paymentRef.current = handle; setPaymentShown(!!handle); }, []);

  // Signed-out submitters must pass the captcha; a payment question's own captcha stands in for it.
  const bypassRecaptcha = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BYPASS_RECAPTCHA === "true";
  const recaptchaSiteKey = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY) || "";
  const showCaptcha = !ApiHelper.isAuthenticated && !bypassRecaptcha && !paymentShown;
  const captchaRef = useRef<ReCAPTCHA>(null);
  const [captchaPass, setCaptchaPass] = React.useState("");

  const getDeleteFunction = () => (!UniqueIdHelper.isMissing(formSubmission?.id)) ? handleDelete : undefined;
  const handleDelete = () => {
    if (formSubmission && window.confirm(Locale.label("formSubmissionEdit.confirmDelete"))) {
      ApiHelper.delete("/formsubmissions/" + formSubmission.id, "MembershipApi").then(() => {
        props.updatedFunction();
      });
    }
  };

  const getAnswer = (questionId: string) => {
    if (!formSubmission?.answers) return null;
    const answers = formSubmission.answers;
    for (let i = 0; i < answers.length; i++) if (answers[i].questionId === questionId) return answers[i];
    return null;
  };

  const setFormSubmissionData = (data: any) => {
    const formId = props.addFormId || props.unRestrictedFormId;
    const fs: FormSubmissionInterface = { formId, contentType: props.contentType, contentId: props.contentId, submittedBy: props.personId || undefined, churchId: props.churchId || undefined, answers: [] };
    fs.questions = data;
    if (fs.questions !== null && fs.questions !== undefined) {
      fs.answers = fs.answers || [];
      for (let i = 0; i < fs.questions.length; i++) {
        if (fs.questions[i].fieldType === "Heading") continue;
        const answer: AnswerInterface = { questionId: fs.questions[i].id, value: "" };
        fs.answers.push(answer);
      }
    }
    setFormSubmission(fs);
  };

  const handleChange = (questionId: string, value: string) => {
    if (!formSubmission) return;
    const fs = { ...formSubmission };
    const answers = [...(fs.answers || [])];
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].questionId === questionId) {
        answers[i].value = value;
        break;
      }
    }
    fs.answers = answers;
    setFormSubmission(fs);
  };

  const renderQuestion = (q: QuestionInterface) => {
    const answer = getAnswer(q.id || "");
    return (
      <QuestionEdit
        key={q.id}
        answer={answer || { questionId: q.id || "", value: "" }}
        question={q}
        changeFunction={handleChange}
        noBackground={noBackground}
        churchId={props.churchId}
        onPaymentRequired={(question) => (
          <FormPaymentQuestion churchId={props.churchId || ""} question={question} ref={setPaymentHandle} />
        )}
      />
    );
  };

  const getVisibleQuestions = () => QuestionVisibility.visibleQuestions(formSubmission?.questions || [], getAnswer);

  const getQuestions = () => getVisibleQuestions().map(renderQuestion);

  const validate = () => {
    const errors: string[] = [];
    getVisibleQuestions().forEach((q) => {
      const answer = getAnswer(q.id || "");
      if (q.required && q.fieldType !== "Heading") {
        if (answer === null || answer.value === null || answer.value === "") errors.push((q.title || "Field") + " " + Locale.label("formSubmissionEdit.isRequired"));
      }
    });
    setErrors(errors);
    return errors;
  };

  const handleCaptchaChange = (value: string | null) => {
    if (!value) { setCaptchaPass(""); return; }
    GuestCaptcha.verify(value, props.churchId || "")
      .then((result) => setCaptchaPass(result.pass))
      .catch(() => setCaptchaPass(""));
  };

  const resetCaptcha = () => {
    setCaptchaPass("");
    captchaRef.current?.reset();
  };

  const handleSave = async () => {
    if (!formSubmission) return;
    setIsSubmitting(true);
    const errors = validate();
    if (errors.length === 0 && showCaptcha && !captchaPass) {
      errors.push(Locale.label("formSubmissionEdit.captchaRequired"));
      setErrors(errors);
    }
    if (errors.length === 0) {
      const promises: Promise<any>[] = [];
      let pass = showCaptcha ? captchaPass : "";

      const visibleQuestions = getVisibleQuestions();
      if (formSubmission.questions) {
        for (let i = 0; i < visibleQuestions.length; i++) {
          const q = visibleQuestions[i];
          if (q.fieldType === "Payment" && paymentRef.current) {
            const paymentResult = await paymentRef.current.handlePayment();
            if (!paymentResult.paymentSuccessful) {
              setErrors(paymentResult.errors || ["Payment failed"]);
              setIsSubmitting(false);
              return;
            }
            pass = paymentResult.captchaPass || pass;
          }
        }
      }

      const visibleIds = visibleQuestions.map((q) => q.id);
      const fs = { ...formSubmission, answers: (formSubmission.answers || []).filter((a) => visibleIds.includes(a.questionId)) };
      (fs as any).submissionDate = new Date();
      promises.push(ApiHelper.post("/formsubmissions", [GuestCaptcha.withPass(fs, pass)], "MembershipApi"));

      Promise.all(promises).then((results) => {
        setIsSubmitting(false);
        const savedSubmission: FormSubmissionInterface | undefined = results?.[0]?.[0];
        if (savedSubmission?.id) setFormSubmission((prev) => prev ? { ...prev, id: savedSubmission.id } : prev);
        props.updatedFunction(savedSubmission);
      }).catch((e) => {
        if (String(e?.message || "").includes("Captcha verification required")) {
          resetCaptcha();
          setErrors([Locale.label("formSubmissionEdit.captchaRequired")]);
        }
        setIsSubmitting(false);
      });
    } else {
      setIsSubmitting(false);
    }
  };

  const loadData = () => {
    if (!UniqueIdHelper.isMissing(props.formSubmissionId)) {
      ApiHelper.get("/formsubmissions/" + props.formSubmissionId + "/?include=questions,answers", "MembershipApi").then((data: FormSubmissionInterface) => {
        setFormSubmission(data);
      });
    } else if (!UniqueIdHelper.isMissing(props.addFormId)) ApiHelper.get("/questions/?formId=" + props.addFormId, "MembershipApi").then((data: any) => setFormSubmissionData(data));
    else if (!UniqueIdHelper.isMissing(props.unRestrictedFormId)) ApiHelper.get("/questions/unrestricted?formId=" + props.unRestrictedFormId, "MembershipApi").then((data: any) => setFormSubmissionData(data));
    /*
		} else {
			const formId = props.addFormId || props.unRestrictedFormId;
			ApiHelper.get("/forms/" + formId + "/details", "MembershipApi").then(setFormSubmissionData);
		}*/
  };

  React.useEffect(loadData, [props.formSubmissionId, props.addFormId, props.unRestrictedFormId]);

  if (!formSubmission) return null;

  const captcha = showCaptcha && (
    <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }} data-testid="form-captcha">
      <ReCAPTCHA sitekey={recaptchaSiteKey} ref={captchaRef} onChange={handleCaptchaChange} onExpired={() => setCaptchaPass("")} onErrored={() => setCaptchaPass("")} />
    </Box>
  );

  if (props.displayMode === "conversational" && (formSubmission.questions?.length || 0) > 0) {
    return (
      <ConversationalForm
        questions={getVisibleQuestions()}
        getAnswer={getAnswer}
        renderInput={renderQuestion}
        errors={errors}
        setErrors={setErrors}
        isSubmitting={isSubmitting}
        onSubmit={handleSave}
        lastStepFooter={captcha}
      />
    );
  }

  return (
    <InputBox
      id="formSubmissionBox"
      headerIcon="assignment"
      headerText={showHeader ? Locale.label("formSubmissionEdit.editForm") : ""}
      saveFunction={handleSave}
      saveText={Locale.label("formSubmissionEdit.submit")}
      cancelFunction={props.cancelFunction}
      deleteFunction={getDeleteFunction()}
      isSubmitting={isSubmitting}
      mainContainerCssProps={noBackground ? { elevation: 0, sx: { backgroundColor: "transparent" } } : undefined}
    >
      <ErrorMessages errors={errors} />
      {getQuestions()}
      {captcha}
    </InputBox>
  );
};
