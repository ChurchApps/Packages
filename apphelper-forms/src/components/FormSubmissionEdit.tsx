"use client";

/// <reference types="react" />
import React, { useRef } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { ErrorMessages, InputBox, QuestionEdit } from "./";
import { Locale } from "../helpers";
import { AnswerInterface, FormSubmissionInterface } from "@churchapps/helpers";
import { ApiHelper, UniqueIdHelper } from "@churchapps/apphelper";
// FormCardPayment will be imported dynamically when needed

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
	updatedFunction: () => void,
	cancelFunction?: () => void,
	stripePromise?: Promise<any>,
	FormCardPaymentComponent?: React.ComponentType<any>
}

export const FormSubmissionEdit: React.FC<Props> = ({ showHeader = true, noBackground = false, ...props }) => {
  const [formSubmission, setFormSubmission] = React.useState<FormSubmissionInterface | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const paymentRef = useRef<any>(null);

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
    const fs: FormSubmissionInterface = { formId, contentType: props.contentType, contentId: props.contentId, answers: [] };
    fs.questions = data;
    if (fs.questions !== null && fs.questions !== undefined) {
      fs.answers = fs.answers || [];
      for (let i = 0; i < fs.questions.length; i++) {
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

  const getQuestions = () => {
    const result: React.ReactElement[] = [];
    if (formSubmission?.questions !== undefined && formSubmission?.questions !== null) {
      for (let i = 0; i < formSubmission.questions.length; i++) {
        const q = formSubmission.questions[i];
        const answer = getAnswer(q.id || "");

        result.push(
					<QuestionEdit
						key={q.id}
						answer={answer || { questionId: q.id || "", value: "" }}
						question={q}
						changeFunction={handleChange}
						noBackground={noBackground}
						churchId={props.churchId}
						onPaymentRequired={(question) =>
						  props.stripePromise && props.FormCardPaymentComponent ? (
								<Elements stripe={props.stripePromise}>
									<props.FormCardPaymentComponent churchId={props.churchId} question={question} ref={paymentRef} />
								</Elements>
						  ) : null
						}
					/>
        );
      }
    }
    return result;
  };

  const validate = () => {
    const errors: string[] = [];
    if (formSubmission?.questions !== undefined && formSubmission?.questions !== null) {
      for (let i = 0; i < formSubmission.questions.length; i++) {
        const q = formSubmission.questions[i];
        const answer = getAnswer(q.id || "");
        if (q.required) {
          if (answer === null || answer.value === null || answer.value === "") errors.push((q.title || "Field") + " " + Locale.label("formSubmissionEdit.isRequired"));
        }
      }
    }
    setErrors(errors);
    return errors;
  };

  const handleSave = async () => {
    if (!formSubmission) return;
    setIsSubmitting(true);
    const errors = validate();
    if (errors.length === 0) {
      const promises: Promise<any>[] = [];

      // Handle payment if needed
      if (formSubmission.questions) {
        for (let i = 0; i < formSubmission.questions.length; i++) {
          const q = formSubmission.questions[i];
          if (q.fieldType === "Payment" && paymentRef.current) {
            const paymentResult = await paymentRef.current.handlePayment();
            if (!paymentResult.paymentSuccessful) {
              setErrors(paymentResult.errors || ["Payment failed"]);
              setIsSubmitting(false);
              return;
            }
          }
        }
      }

      // Save form submission
      const fs = { ...formSubmission };
      (fs as any).submissionDate = new Date();
      promises.push(ApiHelper.post("/formsubmissions", [fs], "MembershipApi"));

      Promise.all(promises).then(() => {
        setIsSubmitting(false);
        props.updatedFunction();
      }).catch(() => {
        setIsSubmitting(false);
      });
    } else {
      setIsSubmitting(false);
    }
  };

  const loadData = () => {
    if (!UniqueIdHelper.isMissing(props.formSubmissionId)) {
      ApiHelper.get("/formsubmissions/" + props.formSubmissionId, "MembershipApi").then((data: FormSubmissionInterface) => {
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
		</InputBox>
  );
};
