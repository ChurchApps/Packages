"use client";

import React, { useRef } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { ErrorMessages, InputBox, QuestionEdit } from "./";
import { ApiHelper, Locale, UniqueIdHelper } from "../helpers";
import { AnswerInterface, QuestionInterface, FormSubmissionInterface } from "@churchapps/helpers";

interface Props {
  addFormId: string,
  contentType: string,
  contentId: string,
  formSubmissionId: string,
  unRestrictedFormId?: string,
  personId?: string,
  churchId?: string,
  showHeader?: boolean,
  noBackground?:boolean,
  updatedFunction: () => void,
  cancelFunction?: () => void
}

export const FormSubmissionEdit: React.FC<Props> = ({ showHeader = true, noBackground = false, ...props }) => {
  const [stripePromise, setStripe] = React.useState<Promise<Stripe>>(null);
  const [formSubmission, setFormSubmission] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const paymentRef = useRef<any>(null);

  const getDeleteFunction = () => (!UniqueIdHelper.isMissing(formSubmission?.id)) ? handleDelete : undefined;
  const handleDelete = () => {
    if (window.confirm(Locale.label("formSubmissionEdit.confirmDelete"))) {
      ApiHelper.delete("/formsubmissions/" + formSubmission.id, "MembershipApi").then(() => {
        props.updatedFunction();
      });
    }
  };

  const getAnswer = (questionId: string) => {
    const answers = formSubmission.answers;
    for (let i = 0; i < answers.length; i++) if (answers[i].questionId === questionId) return answers[i];
    return null;
  };

  const setFormSubmissionData = (data: any) => {
    const formId = props.addFormId || props.unRestrictedFormId;
    const fs: FormSubmissionInterface = { formId, contentType: props.contentType, contentId: props.contentId, answers: [] };
    fs.questions = data;
    fs.answers = [];
    fs.questions.forEach((q) => {
      const answer: AnswerInterface = { formSubmissionId: fs.id, questionId: q.id, required: q.required };
      answer.value = getDefaultValue(q);
      fs.answers.push(answer);
    });
    setFormSubmission(fs);
  };

  const loadData = () => {
    if (!UniqueIdHelper.isMissing(props.formSubmissionId)) ApiHelper.get("/formsubmissions/" + props.formSubmissionId + "/?include=questions,answers,form", "MembershipApi").then((data: any) => setFormSubmission(data));
    else if (!UniqueIdHelper.isMissing(props.addFormId)) ApiHelper.get("/questions/?formId=" + props.addFormId, "MembershipApi").then((data: any) => setFormSubmissionData(data));
    else if (!UniqueIdHelper.isMissing(props.unRestrictedFormId)) ApiHelper.get("/questions/unrestricted?formId=" + props.unRestrictedFormId, "MembershipApi").then((data: any) => setFormSubmissionData(data));
  };

  const getDefaultValue = (q: QuestionInterface) => {
    let result = "";
    if (q.fieldType === "Yes/No") result = "False";
    else if (q.fieldType === "Multiple Choice") {
      if (q.choices !== undefined && q.choices !== null && q.choices.length > 0) result = q.choices[0].value;
    }
    return result;
  };

  const validate = (fs: any) => {
    const e: any = [];
    fs.answers.forEach((a: AnswerInterface) => {

      if (a.required && a.value === "") {
        const q: QuestionInterface = fs.questions.find((q: QuestionInterface) => q.id === a.questionId);
        e.push(q.title + " " + Locale.label("formSubmissionEdit.isRequired"));
        setErrors(e);
      }
    });
    return e.length === 0;
  };

  const handleSave = async () => {
    const fs = formSubmission;
    if (validate(fs)) {
      setIsSubmitting(true);
      // First, handle the payment if there's a payment component
      if (paymentRef.current) {
        const paymentResult = await paymentRef.current.handlePayment();
        if (!paymentResult.paymentSuccessful) {
          setErrors(paymentResult.errors);
          setIsSubmitting(false);
          return;
        } else {
          // Mark payment as successful in answers
          const paymentAnswer = fs.answers.find((a: AnswerInterface) => a.questionId === paymentRef.current.questionId);
          if (paymentAnswer) {
            paymentAnswer.value = `Payment Successful [${paymentResult?.name}]`;
          } else {
            fs.answers.push({
              questionId: paymentRef.current.questionId,
              value: "Payment Successful"
            });
          }
        }
      }

      // If payment is successful or there's no payment, proceed with form submission
      fs.submittedBy = props.personId || null;
      fs.submissionDate = new Date();
      fs.churchId = props.churchId || null;

      ApiHelper.post("/formsubmissions/", [fs], "MembershipApi").then((res: any) => {
        if (res?.[0]?.error) {
          setErrors([res?.[0].error]);
        } else {
          props.updatedFunction();
        }
      })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  const handleChange = (questionId: string, value: string) => {
    const fs = { ...formSubmission };
    let answer: AnswerInterface = null;
    for (let i = 0; i < fs.answers.length; i++) if (fs.answers[i].questionId === questionId) answer = fs.answers[i];
    if (answer !== null) answer.value = value;
    else {
      answer = { formSubmissionId: fs.id, questionId: questionId, value: value };
      fs.answers.push(answer);
    }
    setFormSubmission(fs);
  };

  React.useEffect(() => {
    if (props.churchId) {
      ApiHelper.get("/gateways/churchId/" + props.churchId, "GivingApi").then((data: any) => {
        if (data.length && data[0]?.publicKey) {
          setStripe(loadStripe(data[0].publicKey));
        }
      });
    }
  }, [props.churchId]);

  React.useEffect(loadData, []);

  const questionList = [];
  if (formSubmission != null) {
    const questions = formSubmission.questions;
    for (let i = 0; i < questions.length; i++) questionList.push(<QuestionEdit noBackground={noBackground} key={questions[i].id} question={questions[i]} answer={getAnswer(questions[i].id)} changeFunction={handleChange} churchId={props.churchId} ref={questions[i].fieldType === "Payment" ? paymentRef : null} stripePromise={stripePromise} />);
  }

  return (
    <InputBox id="formSubmissionBox" headerText={showHeader ? (formSubmission?.form?.name || Locale.label("formSubmissionEdit.editForm")) : ""} headerIcon={showHeader ? "person" : ""} mainContainerCssProps={noBackground ? { sx: { backgroundColor: "transparent", boxShadow: 0 } } : {}} saveFunction={handleSave} isSubmitting={isSubmitting} saveText={props.contentType === "form" ? Locale.label("formSubmissionEdit.submit") : ""} cancelFunction={props.cancelFunction} deleteFunction={getDeleteFunction()}>
      <ErrorMessages errors={errors} />
      {questionList}
    </InputBox>
  );
};

