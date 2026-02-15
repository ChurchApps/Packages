"use client";

import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { Stripe } from "@stripe/stripe-js";
import { MuiTelInput } from "mui-tel-input";
import { AnswerInterface, QuestionInterface } from "@churchapps/helpers";
import { Checkbox, Select, MenuItem, SelectChangeEvent, FormControl, InputLabel, TextField, FormLabel, FormGroup, FormControlLabel } from "@mui/material";
import { FormCardPayment } from "./FormCardPayment";

interface Props {
  answer: AnswerInterface
  question: QuestionInterface,
  noBackground?: boolean,
  changeFunction: (questionId: string, value: string) => void,
  churchId?: string,
  ref?: React.ForwardedRef<any>,
  stripePromise?: Promise<Stripe>
}

export const QuestionEdit = React.forwardRef<any, Props>(({ noBackground = false, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    props.changeFunction(props.question.id, e.target.value);
  };

  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedOptions = props.answer.value ? props.answer.value.split(",") : [];
    if (e.target.checked) {
      selectedOptions.push(e.target.name);
    } else {
      const idx = selectedOptions.indexOf(e.target.name);
      selectedOptions.splice(idx, 1);
    }
    props.changeFunction(props.question.id, selectedOptions.join());
  };

  const q = props.question;

  if (q.fieldType === "Heading") return <h5>{q.title}</h5>;
  else {
    let input = null;
    const choiceOptions = [];
    if (q.choices !== undefined && q.choices !== null) {
      if (q.fieldType === "Multiple Choice") {
        for (let i = 0; i < q.choices.length; i++) choiceOptions.push(<MenuItem key={q.choices[i].value} value={q.choices[i].value}>{q.choices[i].text}</MenuItem>);
      } else if (q.fieldType === "Checkbox") {
        for (let i = 0; i < q.choices.length; i++) choiceOptions.push(<FormControlLabel key={q.choices[i].value} label={q.choices[i].text} control={<Checkbox onChange={handleCheck} name={q.choices[i].value} />} />);
      }
    }

    const answerValue = (props.answer === null) ? "" : props.answer.value;
    switch (q.fieldType) {
      case "Textbox": input = <TextField fullWidth style={noBackground ? { backgroundColor: "white", borderRadius: "4px" } : {}} InputLabelProps={{ sx: { fontWeight: "bold" } }} label={q.title} placeholder={q.placeholder} value={answerValue} onChange={handleChange} />; break;
      case "Multiple Choice": {
        input = (
          <FormControl fullWidth style={noBackground ? { backgroundColor: "white", borderRadius: "4px" } : {}}>
            <InputLabel sx={{ fontWeight: "bold" }}>{q.title}</InputLabel>
            <Select fullWidth label={q.title} value={answerValue} onChange={handleChange}>{choiceOptions}</Select>
          </FormControl>);
        break;
      }
      case "Yes/No": {
        input = (
          <FormControl fullWidth style={noBackground ? { backgroundColor: "white", borderRadius: "4px" } : {}}>
            <InputLabel sx={{ fontWeight: "bold" }}>{q.title}</InputLabel>
            <Select fullWidth label={q.title} value={answerValue} onChange={handleChange}>
              <MenuItem value="False">No</MenuItem>
              <MenuItem value="True">Yes</MenuItem>
            </Select>
          </FormControl>);
        break;
      }
      case "Checkbox": {
        input = (
          <FormControl fullWidth sx={{ marginLeft: 1 }}>
            <FormLabel sx={{ fontWeight: "bold" }}>{q.title}</FormLabel>
            <FormGroup>
              {choiceOptions}
            </FormGroup>
          </FormControl>
        );
        break;
      }
      case "Whole Number":
      case "Decimal":
        input = <TextField fullWidth style={noBackground ? { backgroundColor: "white", borderRadius: "4px" } : {}} type="number" InputLabelProps={{ shrink: true, sx: { fontWeight: "bold" } }} label={q.title} placeholder={q.placeholder} value={answerValue} onChange={handleChange} />;
        break;
      case "Date": input = <TextField fullWidth style={noBackground ? { backgroundColor: "white", borderRadius: "4px" } : {}} type="date" InputLabelProps={{ shrink: true, sx: { fontWeight: "bold" } }} label={q.title} placeholder={q.placeholder} value={answerValue} onChange={handleChange} />; break;
      case "Phone Number": input = <MuiTelInput fullWidth style={noBackground ? { backgroundColor: "white", borderRadius: "4px" } : {}} InputLabelProps={{ sx: { fontWeight: "bold" } }} label={q.title} placeholder="" value={answerValue} onChange={(value) => { props.changeFunction(props.question.id, value); }} defaultCountry="US" focusOnSelectCountry excludedCountries={["TA", "AC"]} />; break;
      case "Email": input = <TextField fullWidth style={noBackground ? { backgroundColor: "white", borderRadius: "4px" } : {}} type="email" InputLabelProps={{ sx: { fontWeight: "bold" } }} label={q.title} placeholder="john@doe.com" value={answerValue} onChange={handleChange} />; break;
      case "Text Area": input = <TextField fullWidth style={noBackground ? { backgroundColor: "white", borderRadius: "4px" } : {}} multiline rows={4} InputLabelProps={{ sx: { fontWeight: "bold" } }} label={q.title} placeholder={q.placeholder} value={answerValue} onChange={handleChange} />; break;
      case "Payment": input = <Elements stripe={props.stripePromise}><FormCardPayment churchId={props.churchId} question={q} ref={ref} /></Elements>; break;
      default: return null;
    }
    return input;
  }

});

