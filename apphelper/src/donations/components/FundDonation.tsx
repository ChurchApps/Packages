"use client";

import React from "react";
import { FundDonationInterface, FundInterface, CurrencyHelper } from "@churchapps/helpers";
import { FormControl, Grid, Icon, InputLabel, MenuItem, Select, TextField, Typography, IconButton } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { Locale } from "../helpers";

interface Props {
  fundDonation: FundDonationInterface,
  funds: FundInterface[],
  index: number,
  updatedFunction: (fundDonation: FundDonationInterface, index: number) => void,
  removeFunction?: (index: number) => void,
  params?: any,
  currency?: string,
  hideFundSelect?: boolean,
}

export const FundDonation: React.FC<Props> = (props) => {
  const [value, setValue] = React.useState<number>(0);

  const getOptions = () => {
    const result = [];
    for (let i = 0; i < props.funds.length; i++) {
      const getDisabled = (props?.params?.fundId && props.params.fundId !== "") ? props.params.fundId !== props.funds[i].id : false;
      result.push(<MenuItem key={props.funds[i].id} value={props.funds[i].id} disabled={getDisabled}>{props.funds[i].name}</MenuItem>);
    }
    return result;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const fd = { ...props.fundDonation };
    switch (e.target.name) {
      case "amount":
        fd.amount = Number(e.target.value);
        setValue(Number(e.target.value));
        if (props?.currency && props.currency !== fd.currency) {
          fd.currency = props?.currency || "";
        }
        // fd.amount = parseFloat(e.target.value.replace("$", "").replace(",", ""));
        break;
      case "fund":
        fd.fundId = e.target.value;
        break;
    }
    props.updatedFunction(fd, props.index);
  };

  React.useEffect(() => {
    if (props.currency && props.currency !== props.fundDonation.currency) {
      setValue(CurrencyHelper.convertAmount(props.fundDonation.amount || 0, props.fundDonation.currency || "", props.currency));
    } else {
      setValue(props.fundDonation.amount || 0);
    }
  }, [props.fundDonation]);

  return (
    <>
      <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Grid size={{ xs: (props.removeFunction && props.hideFundSelect) ? 10 : 12, md: props.hideFundSelect ? (props.removeFunction ? 11 : 12) : 5 }}>
          <TextField fullWidth name="amount" label={Locale.label("donation.fundDonations.amount")} type="number" disabled={props.params?.amount && props.params.amount !== ""} aria-label="amount" lang="en-150" value={value || ""} onChange={handleChange} InputProps={{ startAdornment: <Icon><Typography>{props.currency ? CurrencyHelper.getCurrencySymbol(props.currency) : "$"}</Typography></Icon> }} />
        </Grid>
        {!props.hideFundSelect && (
          <Grid size={{ xs: props.removeFunction ? 10 : 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("donation.fundDonations.fund")}</InputLabel>
              <Select fullWidth label={Locale.label("donation.fundDonations.fund")} name="fund" aria-label="fund" value={props.fundDonation.fundId} onChange={handleChange}>
                {getOptions()}
              </Select>
            </FormControl>
          </Grid>
        )}
        {props.removeFunction && (
          <Grid size={{ xs: 2, md: 1 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton onClick={() => props.removeFunction?.(props.index)} color="error" aria-label="remove">
              <Icon>delete</Icon>
            </IconButton>
          </Grid>
        )}
      </Grid>
    </>
  );
};

