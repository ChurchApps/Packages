"use client";

import React, { useState, useRef, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { ErrorMessages, InputBox } from "../../../index";
import { FundDonations } from "../../components";
import { ApiHelper, DateHelper, CurrencyHelper } from "@churchapps/helpers";
import { Locale, DonationHelper } from "../../helpers";
import { FundDonationInterface, FundInterface, ChurchInterface } from "@churchapps/helpers";
import {
  Grid, Alert, TextField, Button, FormControl, InputLabel, Select, MenuItem,
  FormGroup, FormControlLabel, Checkbox, Typography
} from "@mui/material";
import type { PaperProps } from "@mui/material/Paper";
import { openPaystackPopup } from "./paystackPopup";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
  allowRecurring?: boolean;
  showFundSelector?: boolean;
  allowedFundIds?: string[];
  defaultFundId?: string;
}

export const PaystackNonAuthDonationInner: React.FC<Props> = ({ mainContainerCssProps, showHeader = true, ...props }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [fundsTotal, setFundsTotal] = useState<number>(0);
  const [transactionFee, setTransactionFee] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [fundDonations, setFundDonations] = useState<FundDonationInterface[]>([]);
  const [funds, setFunds] = useState<FundInterface[]>([]);
  const [donationComplete, setDonationComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [donationType, setDonationType] = useState<"once" | "recurring">("once");
  const [interval, setInterval] = useState("one_month");
  const [startDate, setStartDate] = useState(new Date().toDateString());
  const [captchaResponse, setCaptchaResponse] = useState("");
  const [church, setChurch] = useState<ChurchInterface>();
  const [gateway, setGateway] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [coverFees, setCoverFees] = useState(false);
  const captchaRef = useRef<ReCAPTCHA>(null);
  const currency: string = gateway?.currency || "ngn";
  const fmt = (amount: number) => CurrencyHelper.formatCurrencyWithLocale(amount, currency);

  const getUrlParam = (param: string) => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get(param);
  };

  const init = () => {
    const fundId = props.defaultFundId || getUrlParam("fundId");
    const amount = getUrlParam("amount");
    setSearchParams({ fundId, amount });

    ApiHelper.get("/funds/churchId/" + props.churchId, "GivingApi").then((data: any) => {
      const list: FundInterface[] = props.allowedFundIds?.length ? data.filter((f: FundInterface) => props.allowedFundIds!.includes(f.id!)) : data;
      setFunds(list);
      const selected = fundId ? list.find((f: FundInterface) => f.id === fundId) : undefined;
      if (selected) setFundDonations([{ fundId: selected.id, amount: amount ? parseFloat(amount) : 0 }]);
      else if (list.length) setFundDonations([{ fundId: list[0].id }]);
    });
    ApiHelper.get("/churches/" + props.churchId, "MembershipApi").then((data: any) => setChurch(data));
    ApiHelper.get(`/donate/gateways/${props.churchId}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const gw = DonationHelper.findGatewayByProvider(gateways, "paystack");
      if (gw) setGateway(gw);
    });
  };

  const handleCaptchaChange = (value: string | null) => {
    if (!value) { setCaptchaResponse(""); return; }
    ApiHelper.postAnonymous("/donate/captcha-verify", { token: value }, "GivingApi")
      .then((data: any) => {
        const ok = data.response === "success" || data.response === "human" || data.success === true || data.score >= 0.5;
        setCaptchaResponse(ok ? "success" : (data.response || "robot"));
      })
      .catch(() => setCaptchaResponse("error"));
  };

  const handleCheckChange = (_e: React.SyntheticEvent, checked: boolean) => {
    setCoverFees(checked);
    setTotal(checked ? fundsTotal + transactionFee : fundsTotal);
  };

  const validate = () => {
    const result: string[] = [];
    if (!firstName) result.push(Locale.label("donation.donationForm.validate.firstName"));
    if (!lastName) result.push(Locale.label("donation.donationForm.validate.lastName"));
    if (!email) result.push(Locale.label("donation.donationForm.validate.email"));
    if (fundsTotal === 0) result.push(Locale.label("donation.donationForm.validate.amount"));
    if (result.length === 0 && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) result.push(Locale.label("donation.donationForm.validate.validEmail"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!captchaResponse) { setErrors([Locale.label("donation.kingdomFunding.validate.captchaRequired")]); return; }
    if (captchaResponse !== "success") { setErrors([Locale.label("donation.kingdomFunding.validate.captchaFailed")]); return; }
    setProcessing(true);
    try {
      await ApiHelper.post("/users/loadOrCreate", { userEmail: email, firstName, lastName }, "MembershipApi");
      const person = await ApiHelper.post("/people/loadOrCreate", { churchId: props.churchId, firstName, lastName, email }, "MembershipApi");
      await processDonation(person);
    } catch (ex: any) {
      setErrors([ex.toString()]);
    }
    setProcessing(false);
  };

  const processDonation = async (person: any) => {
    const compactFunds = fundDonations
      .filter(fd => (fd.amount || 0) > 0 && fd.fundId)
      .map(fd => ({ id: fd.fundId, amount: fd.amount || 0 }));
    const personPayload = { id: person?.id || "", email: person?.contactInfo?.email || email, name: person?.name?.display || `${firstName} ${lastName}` };

    let reference: string;
    try {
      const result = await openPaystackPopup({
        key: gateway?.publicKey || "",
        email: personPayload.email,
        amount: total,
        currency,
        metadata: { personId: personPayload.id, funds: compactFunds, churchId: props.churchId }
      });
      reference = result.reference;
    } catch (e: any) {
      if (e?.message !== "cancelled") setErrors([e?.message || Locale.label("donation.paystack.paymentFailed")]);
      return;
    }

    const payload: any = {
      provider: "paystack",
      gatewayId: gateway?.id,
      churchId: props.churchId,
      amount: total,
      currency,
      funds: compactFunds,
      person: personPayload,
      notes,
      church: { name: church?.name || "", subDomain: church?.subDomain || "", churchURL: typeof window !== "undefined" ? window.location.origin : "", logo: props?.churchLogo || "" },
      type: "card",
      id: reference
    };
    if (donationType === "recurring") {
      payload.billing_cycle_anchor = startDate ? +new Date(startDate) : +new Date();
      payload.interval = DonationHelper.getInterval(interval);
    }

    try {
      const results = await ApiHelper.post(donationType === "once" ? "/donate/charge" : "/donate/subscribe", payload, "GivingApi");
      if (["succeeded", "pending", "active", "processing"].includes(results?.status)) setDonationComplete(true);
      else setErrors([results?.error || results?.message || Locale.label("donation.kingdomFunding.unexpectedError")]);
    } catch (error: any) {
      setErrors([error.message || Locale.label("donation.kingdomFunding.errorProcessingDonation")]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.currentTarget.value;
    switch (e.currentTarget.name) {
      case "firstName": setFirstName(val); break;
      case "lastName": setLastName(val); break;
      case "email": setEmail(val); break;
      case "startDate": setStartDate(val); break;
      case "notes": setNotes(val); break;
    }
  };

  const handleFundDonationsChange = async (fd: FundDonationInterface[]) => {
    setFundDonations(fd);
    const totalAmount = fd.reduce((t, f) => t + (f.amount || 0), 0);
    setFundsTotal(totalAmount);
    const fee = await getTransactionFee(totalAmount);
    setTransactionFee(fee);
    setTotal(gateway?.payFees === true || coverFees ? totalAmount + fee : totalAmount);
  };

  const getTransactionFee = async (amount: number) => {
    if (amount <= 0) return 0;
    try {
      const response = await ApiHelper.post("/donate/fee?churchId=" + props.churchId, { amount, provider: "paystack", gatewayId: gateway?.id, currency }, "GivingApi");
      return response.calculatedFee;
    } catch {
      return 0;
    }
  };

  useEffect(init, []);

  if (donationComplete) return <Alert severity="success">{Locale.label("donation.donationForm.thankYou")}</Alert>;

  return (
    <InputBox
      headerIcon={showHeader ? "volunteer_activism" : ""}
      headerText={showHeader ? Locale.label("donation.donationForm.donate") : ""}
      saveFunction={handleSave}
      saveText={Locale.label("donation.donationForm.donate")}
      isSubmitting={processing}
      mainContainerCssProps={mainContainerCssProps}
    >
      <ErrorMessages errors={errors} />
      <Grid container spacing={3}>
        {props.allowRecurring !== false && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <Button aria-label="single-donation" size="small" fullWidth style={{ minHeight: "50px" }} variant={donationType === "once" ? "contained" : "outlined"} onClick={() => setDonationType("once")}>
                {Locale.label("donation.donationForm.make")}
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Button aria-label="recurring-donation" size="small" fullWidth style={{ minHeight: "50px" }} variant={donationType === "recurring" ? "contained" : "outlined"} onClick={() => setDonationType("recurring")}>
                {Locale.label("donation.donationForm.makeRecurring")}
              </Button>
            </Grid>
          </>
        )}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label={Locale.label("person.firstName")} name="firstName" value={firstName} onChange={handleChange} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label={Locale.label("person.lastName")} name="lastName" value={lastName} onChange={handleChange} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label={Locale.label("person.email")} name="email" value={email} onChange={handleChange} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReCAPTCHA sitekey={props.recaptchaSiteKey} ref={captchaRef} onChange={handleCaptchaChange} onExpired={() => setCaptchaResponse("")} onErrored={() => setCaptchaResponse("error")} />
        </Grid>
      </Grid>

      {gateway?.publicKey
        ? <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} data-testid="paystack-entry">{Locale.label("donation.paystack.popupHint")}</Typography>
        : <Alert severity="warning" sx={{ mt: 2 }}>{Locale.label("donation.kingdomFunding.gatewayConfigMissing")}</Alert>}

      {donationType === "recurring" && (
        <Grid container spacing={3} style={{ marginTop: 16 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("donation.donationForm.frequency")}</InputLabel>
              <Select label="Frequency" name="interval" aria-label="interval" value={interval} onChange={(e) => setInterval(e.target.value)}>
                <MenuItem value="one_week">{Locale.label("donation.donationForm.weekly")}</MenuItem>
                <MenuItem value="one_month">{Locale.label("donation.donationForm.monthly")}</MenuItem>
                <MenuItem value="three_month">{Locale.label("donation.donationForm.quarterly")}</MenuItem>
                <MenuItem value="one_year">{Locale.label("donation.donationForm.annually")}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth type="date" name="startDate" aria-label="startDate" label={Locale.label("donation.donationForm.startDate")} value={DateHelper.formatHtml5Date(startDate ? new Date(startDate) : new Date())} onChange={handleChange} />
          </Grid>
        </Grid>
      )}

      {funds.length > 0 && props.showFundSelector !== false && (
        <>
          <hr />
          <h4>{Locale.label("donation.donationForm.funds")}</h4>
          <FundDonations fundDonations={fundDonations} funds={funds} params={searchParams} updatedFunction={handleFundDonationsChange} />
        </>
      )}

      <TextField fullWidth label={Locale.label("donation.kingdomFunding.memo")} multiline aria-label="note" name="notes" value={notes} onChange={handleChange} style={{ marginTop: 10, marginBottom: 10 }} />

      {fundsTotal > 0 && (
        <div>
          {gateway?.payFees === true ? (
            <Typography fontSize={14} fontStyle="italic">*{Locale.label("donation.donationForm.fees").replace("{}", fmt(transactionFee))}</Typography>
          ) : (
            <FormGroup>
              <FormControlLabel control={<Checkbox checked={coverFees} />} name="transaction-fee" label={Locale.label("donation.donationForm.cover").replace("{}", fmt(transactionFee))} onChange={handleCheckChange} />
            </FormGroup>
          )}
          <p>{Locale.label("donation.donationForm.total")}: {fmt(total)}</p>
        </div>
      )}
    </InputBox>
  );
};
