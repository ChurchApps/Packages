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
import { KingdomFundingTokenForm, KingdomFundingTokenFormHandle } from "./KingdomFundingTokenForm";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
  paymentType?: "card" | "bank";
}

export const KingdomFundingNonAuthDonationInner: React.FC<Props> = ({ mainContainerCssProps, showHeader = true, ...props }) => {
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
  const [_captchaResponse, setCaptchaResponse] = useState("");
  const [church, setChurch] = useState<ChurchInterface>();
  const [gateway, setGateway] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [coverFees, setCoverFees] = useState(false);
  const captchaRef = useRef<ReCAPTCHA>(null);
  const kfTokenRef = useRef<KingdomFundingTokenFormHandle>(null);

  const [payMethod, setPayMethod] = useState<"card" | "ach">(
    props.paymentType === "bank" ? "ach" : "card"
  );
  const paymentType: "card" | "bank" = payMethod === "ach" ? "bank" : "card";

  const getUrlParam = (param: string) => {
    if (typeof window === "undefined") return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  const init = () => {
    const fundId = getUrlParam("fundId");
    const amount = getUrlParam("amount");
    setSearchParams({ fundId, amount });

    ApiHelper.get("/funds/churchId/" + props.churchId, "GivingApi").then((data: any) => {
      setFunds(data);
      if (fundId && fundId !== "") {
        const selectedFund = data.find((f: FundInterface) => f.id === fundId);
        if (selectedFund) {
          setFundDonations([{ fundId: selectedFund.id, amount: (amount && amount !== "") ? parseFloat(amount) : 0 }]);
        }
      } else if (data.length) {
        setFundDonations([{ fundId: data[0].id }]);
      }
    });
    ApiHelper.get("/churches/" + props.churchId, "MembershipApi").then((data: any) => {
      setChurch(data);
    });
    ApiHelper.get(`/donate/gateways/${props.churchId}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const kfGateway = DonationHelper.findGatewayByProvider(gateways, "kingdomfunding");
      if (kfGateway) setGateway(kfGateway);
    });
  };

  const handleCaptchaChange = (value: string | null) => {
    if (value) {
      ApiHelper.postAnonymous("/donate/captcha-verify", { token: value }, "GivingApi")
        .then((data: any) => {
          if (data.response === "success" || data.response === "human" || data.success === true || data.score >= 0.5) {
            setCaptchaResponse("success");
          } else {
            setCaptchaResponse(data.response || "robot");
          }
        })
        .catch(() => {
          setCaptchaResponse("error");
        });
    } else {
      setCaptchaResponse("");
    }
  };

  const handleCheckChange = (_e: React.SyntheticEvent<Element, Event>, checked: boolean) => {
    setCoverFees(checked);
    const totalPayAmount = checked ? fundsTotal + transactionFee : fundsTotal;
    setTotal(totalPayAmount);
  };

  const validate = () => {
    const result: string[] = [];
    if (!firstName) result.push(Locale.label("donation.donationForm.validate.firstName"));
    if (!lastName) result.push(Locale.label("donation.donationForm.validate.lastName"));
    if (!email) result.push(Locale.label("donation.donationForm.validate.email"));
    if (fundsTotal === 0) result.push(Locale.label("donation.donationForm.validate.amount"));
    if (result.length === 0) {
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) result.push(Locale.label("donation.donationForm.validate.validEmail"));
    }
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      if (!_captchaResponse) {
        setErrors([Locale.label("donation.kingdomFunding.validate.captchaRequired")]);
        return;
      }
      if (_captchaResponse !== "success") {
        setErrors([Locale.label("donation.kingdomFunding.validate.captchaFailed")]);
        return;
      }

      setProcessing(true);
      try {
        await ApiHelper.post("/users/loadOrCreate", { userEmail: email, firstName, lastName }, "MembershipApi");
        const personData = { churchId: props.churchId, firstName, lastName, email };
        const person = await ApiHelper.post("/people/loadOrCreate", personData, "MembershipApi");
        await processDonation(person);
      } catch (ex: any) {
        setErrors([ex.toString()]);
        setProcessing(false);
      }
    }
  };

  const processDonation = async (person: any) => {
    const churchObj = {
      name: church?.name || "",
      subDomain: church?.subDomain || "",
      churchURL: typeof window !== "undefined" ? window.location.origin : "",
      logo: props?.churchLogo || ""
    };

    const compactFunds = fundDonations
      .filter(fd => (fd.amount || 0) > 0 && fd.fundId)
      .map(fd => ({ id: fd.fundId, amount: fd.amount || 0 }));

    const basePayload: any = {
      provider: "kingdomfunding",
      gatewayId: gateway?.id,
      churchId: props.churchId,
      amount: total,
      funds: compactFunds,
      person: {
        id: person?.id || "",
        email: person?.contactInfo?.email || email,
        name: person?.name?.display || `${firstName} ${lastName}`
      },
      notes,
      church: churchObj
    };

    try {
      const tokenResult = await kfTokenRef.current?.getNonce();
      if (!tokenResult?.nonce) {
        setErrors([Locale.label("donation.kingdomFunding.failedToProcessCard")]);
        setProcessing(false);
        return;
      }
      basePayload.type = paymentType;
      basePayload.id = tokenResult.nonce;
      if (paymentType === "bank") {
        basePayload.name = "Bank account ****" + (tokenResult.accountLast4 || "");
        basePayload.accountLast4 = tokenResult.accountLast4;
      } else {
        basePayload.cardBrand = tokenResult.cardType;
        basePayload.cardLast4 = tokenResult.last4;
        basePayload.expiry_month = tokenResult.expiryMonth;
        basePayload.expiry_year = tokenResult.expiryYear;
      }

      if (donationType === "recurring") {
        basePayload.billing_cycle_anchor = startDate ? +new Date(startDate) : +new Date();
        basePayload.interval = DonationHelper.getInterval(interval);
      }

      let results;
      if (donationType === "once") {
        results = await ApiHelper.post("/donate/charge", basePayload, "GivingApi");
      } else {
        results = await ApiHelper.post("/donate/subscribe", basePayload, "GivingApi");
      }

      if (results?.status === "succeeded" || results?.status === "pending" || results?.status === "active" || results?.status === "processing" || results?.status === "Approved") {
        setDonationComplete(true);
      } else if (results?.raw?.message || results?.message || results?.error) {
        setErrors([results?.raw?.message || results?.message || results?.error]);
      } else {
        setErrors([Locale.label("donation.kingdomFunding.unexpectedError")]);
      }
    } catch (error: any) {
      setErrors([error.message || Locale.label("donation.kingdomFunding.errorProcessingDonation")]);
    }

    setProcessing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.currentTarget.value;
    switch (e.currentTarget.name) {
      case "firstName": setFirstName(val); break;
      case "lastName": setLastName(val); break;
      case "email": setEmail(val); break;
      case "startDate": setStartDate(val); break;
      case "interval": setInterval(val); break;
      case "notes": setNotes(val); break;
    }
  };

  const handleFundDonationsChange = async (fd: FundDonationInterface[]) => {
    setFundDonations(fd);
    let totalAmount = 0;
    for (const fundDonation of fd) {
      totalAmount += fundDonation.amount || 0;
    }
    setFundsTotal(totalAmount);

    const fee = await getTransactionFee(totalAmount);
    setTransactionFee(fee);

    if (gateway?.payFees === true) {
      setTotal(totalAmount + fee);
    } else {
      setTotal(coverFees ? totalAmount + fee : totalAmount);
    }
  };

  const getTransactionFee = async (amount: number) => {
    if (amount > 0) {
      try {
        const response = await ApiHelper.post(
          "/donate/fee?churchId=" + props.churchId,
          { amount, provider: "kingdomfunding", gatewayId: gateway?.id },
          "GivingApi"
        );
        return response.calculatedFee;
      } catch {
        return 0;
      }
    }
    return 0;
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
        <Grid size={{ xs: 12, md: 6 }}>
          <Button
            aria-label="single-donation"
            size="small"
            fullWidth
            style={{ minHeight: "50px" }}
            variant={donationType === "once" ? "contained" : "outlined"}
            onClick={() => setDonationType("once")}
          >
            {Locale.label("donation.donationForm.make")}
          </Button>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Button
            aria-label="recurring-donation"
            size="small"
            fullWidth
            style={{ minHeight: "50px" }}
            variant={donationType === "recurring" ? "contained" : "outlined"}
            onClick={() => setDonationType("recurring")}
          >
            {Locale.label("donation.donationForm.makeRecurring")}
          </Button>
        </Grid>
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
          <ReCAPTCHA
            sitekey={props.recaptchaSiteKey}
            ref={captchaRef}
            onChange={handleCaptchaChange}
            onExpired={() => setCaptchaResponse("")}
            onErrored={() => setCaptchaResponse("error")}
          />
        </Grid>
      </Grid>

      {gateway?.publicKey ? (
        <div style={{ marginTop: 16 }}>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 6 }}>
              <Button
                aria-label="pay-card"
                fullWidth
                variant={payMethod === "card" ? "contained" : "outlined"}
                onClick={() => setPayMethod("card")}
              >
                {Locale.label("donation.kingdomFunding.payWithCard")}
              </Button>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Button
                aria-label="pay-bank"
                fullWidth
                variant={payMethod === "ach" ? "contained" : "outlined"}
                onClick={() => setPayMethod("ach")}
              >
                {Locale.label("donation.kingdomFunding.payWithBank")}
              </Button>
            </Grid>
          </Grid>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {paymentType === "bank"
              ? Locale.label("donation.kingdomFunding.enterBankDetails")
              : Locale.label("donation.kingdomFunding.enterCardDetails")}
          </Typography>
          <KingdomFundingTokenForm
            ref={kfTokenRef}
            tokenizationKey={gateway.publicKey}
            paymentMethod={payMethod}
            sandbox={gateway?.settings?.sandbox === true || gateway?.environment === "sandbox"}
          />
        </div>
      ) : null}

      {donationType === "recurring" && (
        <Grid container spacing={3} style={{ marginTop: 16 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("donation.donationForm.frequency")}</InputLabel>
              <Select
                label="Frequency"
                name="interval"
                aria-label="interval"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                <MenuItem value="one_week">{Locale.label("donation.donationForm.weekly")}</MenuItem>
                <MenuItem value="two_week">{Locale.label("donation.donationForm.biWeekly")}</MenuItem>
                <MenuItem value="one_month">{Locale.label("donation.donationForm.monthly")}</MenuItem>
                <MenuItem value="three_month">{Locale.label("donation.donationForm.quarterly")}</MenuItem>
                <MenuItem value="one_year">{Locale.label("donation.donationForm.annually")}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              type="date"
              name="startDate"
              aria-label="startDate"
              label={Locale.label("donation.donationForm.startDate")}
              value={DateHelper.formatHtml5Date(startDate ? new Date(startDate) : new Date())}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      )}

      {funds.length > 0 && (
        <>
          <hr />
          <h4>{Locale.label("donation.donationForm.funds")}</h4>
          <FundDonations fundDonations={fundDonations} funds={funds} params={searchParams} updatedFunction={handleFundDonationsChange} />
        </>
      )}

      <TextField
        fullWidth
        label={Locale.label("donation.kingdomFunding.memo")}
        multiline
        aria-label="note"
        name="notes"
        value={notes}
        onChange={handleChange}
        style={{ marginTop: 10, marginBottom: 10 }}
      />

      <div>
        {fundsTotal > 0 && (
          <>
            {gateway?.payFees === true ? (
              <Typography fontSize={14} fontStyle="italic">
                *{Locale.label("donation.donationForm.fees").replace("{}", CurrencyHelper.formatCurrency(transactionFee))}
              </Typography>
            ) : (
              <FormGroup>
                <FormControlLabel
                  control={<Checkbox checked={coverFees} />}
                  name="transaction-fee"
                  label={Locale.label("donation.donationForm.cover").replace("{}", CurrencyHelper.formatCurrency(transactionFee))}
                  onChange={handleCheckChange}
                />
              </FormGroup>
            )}
            <p>{Locale.label("donation.donationForm.total")}: {CurrencyHelper.formatCurrency(total)}</p>
          </>
        )}
      </div>
    </InputBox>
  );
};
