"use client";

import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { ElementInterface, EnvironmentHelper } from "../../helpers";
import { Loading, UserHelper } from "@churchapps/apphelper";
import { FormSubmissionEdit } from "@churchapps/apphelper-forms";
import { ApiHelper } from "@churchapps/apphelper";
import type { ChurchInterface } from "@churchapps/helpers";

interface Props {
  element: ElementInterface;
  church: ChurchInterface;
}

export interface FormInterface { id?: string, name?: string, contentType?: string, restricted?: boolean, accessStartTime?: Date, accessEndTime?: Date, archived: boolean, action?: string, thankYouMessage?: string }

export const FormElement = (props: Props) => {
  const [addFormId, setAddFormId] = useState<string>("");
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [unRestrictedFormId, setUnRestrictedFormId] = useState<string>("");
  const formId = props.element.answers.formId;
  const [form, setForm] = useState<FormInterface | undefined>(undefined);


  useEffect(() => {
    if (formId && props.church) {
      loadData();
    }
  }, [formId, props.church]);

  const loadData = async () => {
    await EnvironmentHelper.init();
    ApiHelper.get(
      "/forms/standalone/" + formId + "?churchId=" + props.church.id,
      "MembershipApi"
    ).then((data: any) => {
      if (data.restricted) setAddFormId(formId);
      else setUnRestrictedFormId(formId);
      setForm(data);
    });
  };

  const handleUpdate = () => setIsFormSubmitted(true);

  if (!(props.church && formId && (addFormId || unRestrictedFormId))) {
    return <Loading />;
  }

  if (isFormSubmitted) {
    return (
      <p>
        {form?.thankYouMessage ? form.thankYouMessage : "Your form has been successfully submitted."}
        <Button
          variant="text"
          size="small"
          onClick={() => setIsFormSubmitted(false)}
          data-testid="form-fill-again-button"
        >
          Fill Again
        </Button>
      </p>
    );
  }

  return (
    <>
      <FormSubmissionEdit
        churchId={props.church.id}
        addFormId={addFormId}
        unRestrictedFormId={unRestrictedFormId}
        contentType="form"
        contentId={formId}
        formSubmissionId=""
        personId={UserHelper?.person?.id}
        updatedFunction={handleUpdate}
        showHeader={false}
        noBackground={true}
      />
    </>
  );
};
