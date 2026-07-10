"use client";

import React from "react";
import { ApiHelper } from "@churchapps/helpers";
import { Locale } from "../helpers";
import { ChurchInterface, RegisterChurchRequestInterface } from "@churchapps/helpers";
import { ErrorMessages, InputBox } from "../..";
import { Grid, TextField } from "@mui/material";

interface Props {
  initialChurchName: string,
  registeredChurchCallback?: (church: ChurchInterface) => void,
  selectChurch: (churchId: string) => void,
  appName: string
}

export const SelectChurchRegister: React.FC<Props> = (props) => {
  const suggestSubDomain = (name: string) => {
    const result = name.toLowerCase().replaceAll("christian", "").replaceAll("church", "").replaceAll(" ", "");
    return result;
  };

  const [church, setChurch] = React.useState<RegisterChurchRequestInterface>({ name: props.initialChurchName, appName: props.appName, subDomain: suggestSubDomain(props.initialChurchName) });
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const c = { ...church };
    switch (e.target.name) {
      case "churchName": c.name = e.target.value; break;
      case "subDomain": c.subDomain = e.target.value; break;
      case "address1": c.address1 = e.target.value; break;
      case "address2": c.address2 = e.target.value; break;
      case "city": c.city = e.target.value; break;
      case "state": c.state = e.target.value; break;
      case "zip": c.zip = e.target.value; break;
      case "country": c.country = e.target.value; break;
    }
    setChurch(c);
  };

  const validate = () => {
    const errors = [];
    if (!church.name?.trim()) errors.push(Locale.label("selectChurch.validate.name"));
    if (!church.address1?.trim()) errors.push(Locale.label("selectChurch.validate.address"));
    if (!church.city?.trim()) errors.push(Locale.label("selectChurch.validate.city"));
    if (!church.state?.trim()) errors.push(Locale.label("selectChurch.validate.state"));
    if (!church.zip?.trim()) errors.push(Locale.label("selectChurch.validate.zip"));
    if (!church.country?.trim()) errors.push(Locale.label("selectChurch.validate.country"));
    setErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      setIsSubmitting(true);
      const c = { ...church };
      if (!c.subDomain) c.subDomain = suggestSubDomain(c.name || "");
      ApiHelper.post("/churches/add", church, "MembershipApi")
        .then(async (resp: any) => {
          if (resp.errors !== undefined) setErrors(resp.errors);
          else {
            if (props.registeredChurchCallback) props.registeredChurchCallback(resp);
            props.selectChurch(resp.id);
          }
        })
        .catch((e: any) => {
          setErrors([e.toString()]);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  return (
    <InputBox id="churchBox" saveFunction={handleSave} headerText={Locale.label("selectChurch.register")} headerIcon="church" isSubmitting={isSubmitting} saveTextSubmitting={Locale.label("common.pleaseWait")}>
      <ErrorMessages errors={errors} />
      <TextField required fullWidth name="churchName" label={Locale.label("selectChurch.name")} value={church.name} onChange={handleChange} />

      <TextField required fullWidth name="address1" label={Locale.label("selectChurch.address1")} value={church.address1} onChange={handleChange} />
      <Grid container spacing={3}>
        <Grid size={6}><TextField fullWidth name="address2" label={Locale.label("selectChurch.address2")} value={church.address2} onChange={handleChange} /></Grid>
        <Grid size={6}><TextField required fullWidth name="city" label={Locale.label("selectChurch.city")} value={church.city} onChange={handleChange} /></Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid size={6}><TextField required fullWidth name="state" label={Locale.label("selectChurch.state")} value={church.state} onChange={handleChange} /></Grid>
        <Grid size={6}><TextField required fullWidth name="zip" label={Locale.label("selectChurch.zip")} value={church.zip} onChange={handleChange} /></Grid>
      </Grid>
      <TextField required fullWidth name="country" label={Locale.label("selectChurch.country")} value={church.country} onChange={handleChange} />
    </InputBox>
  );
};

