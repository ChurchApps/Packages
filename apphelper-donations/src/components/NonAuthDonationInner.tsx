"use client";

import { CardNumberElement, CardExpiryElement, CardCvcElement, useElements, useStripe } from "@stripe/react-stripe-js";
import React, { useState, useRef, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { ErrorMessages, InputBox } from "@churchapps/apphelper";
import { FundDonations } from ".";
import { ApiHelper, DateHelper, CurrencyHelper } from "@churchapps/helpers";
import { Locale, DonationHelper, StripePaymentMethod } from "../helpers";
import { FundDonationInterface, FundInterface, PersonInterface, StripeDonationInterface, UserInterface, ChurchInterface } from "@churchapps/helpers";
import { Grid, Alert, TextField, Button, FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel, Checkbox, Typography, Box, CircularProgress } from "@mui/material";
import type { PaperProps } from "@mui/material/Paper";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
  paymentType?: "card" | "bank";
}

export const NonAuthDonationInner: React.FC<Props> = ({ mainContainerCssProps, showHeader = true, ...props }) => {
  const stripe = useStripe();
  const elements = useElements();
  const formStyling = { style: { base: { fontSize: "18px" } } };
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
  const bypassRecaptcha = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BYPASS_RECAPTCHA === "true";
  const [_captchaResponse, setCaptchaResponse] = useState(bypassRecaptcha ? "success" : "");
  const [church, setChurch] = useState<ChurchInterface>();
  const [gateway, setGateway] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [coverFees, setCoverFees] = useState(false);
  const [bankConnecting, setBankConnecting] = useState(false);
  const captchaRef = useRef<ReCAPTCHA>(null);

  // Use paymentType from props, defaulting to "card"
  const paymentType = props.paymentType || "card";

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
      const stripeGateway = DonationHelper.findGatewayByProvider(gateways, "stripe");
      if (stripeGateway) setGateway(stripeGateway);
    });
  };

  const handleCaptchaChange = (value: string | null) => {
    if (value) {

      ApiHelper.postAnonymous("/donate/captcha-verify", { token: value }, "GivingApi")
        .then((data: any) => {
          // Check for various success indicators
          if (data.response === "success" || data.response === "human" || data.success === true || data.score >= 0.5) {
            setCaptchaResponse("success");
          } else {
            setCaptchaResponse(data.response || "robot");
          }
        })
        .catch((error: any) => {
          console.error("Error verifying captcha:", error);
          // Log more details about the error
          if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
          }
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


  const handleSave = async () => {
    if (validate()) {
      // Validate captcha first
      if (!_captchaResponse) {
        setErrors(["Please complete the reCAPTCHA verification"]);
        return;
      }
      if (_captchaResponse === "robot") {
        setErrors(["reCAPTCHA verification failed - detected as robot. Please try again."]);
        return;
      }
      if (_captchaResponse === "error") {
        setErrors(["reCAPTCHA verification error. Please try again."]);
        return;
      }
      if (_captchaResponse !== "success") {
        setErrors([`reCAPTCHA verification unexpected response: ${_captchaResponse}`]);
        return;
      }

      setProcessing(true);
      ApiHelper.post("/users/loadOrCreate", { userEmail: email, firstName, lastName }, "MembershipApi")
        .catch((ex: any) => { setErrors([ex.toString()]); setProcessing(false); })
        .then(async (userData: any) => {
          const personData = { churchId: props.churchId, firstName, lastName, email };
          const person = await ApiHelper.post("/people/loadOrCreate", personData, "MembershipApi");
          if (paymentType === "bank") {
            saveBank(userData, person);
          } else {
            saveCard(userData, person);
          }
        });
    }
  };

  const saveCard = async (_user: UserInterface, person: PersonInterface) => {
    if (gateway?.provider?.toLowerCase() !== "stripe") {
      setErrors(["Stripe payment processing not available for this gateway"]);
      setProcessing(false);
      return;
    }

    const cardData = elements?.getElement(CardNumberElement);
    if (!stripe || !cardData) {
      setErrors(["Payment processing unavailable"]);
      setProcessing(false);
      return;
    }
    const stripePM = await stripe.createPaymentMethod({ type: "card", card: cardData });
    if (stripePM.error) { setErrors([stripePM.error.message || "Payment method error"]); setProcessing(false); } else {
      const pm = { id: stripePM.paymentMethod!.id, personId: person.id, email: email, name: person?.name?.display || "", churchId: props.churchId };
      await ApiHelper.post(
        "/paymentmethods/addcard",
        { ...pm, provider: gateway?.provider || "stripe", gatewayId: gateway?.id },
        "GivingApi"
      ).then((result: any) => {
        if (result?.raw?.message) {
          setErrors([result.raw.message]);
          setProcessing(false);
        } else {
          const d: { paymentMethod: StripePaymentMethod, customerId: string } = result;
          saveDonation(d.paymentMethod, d.customerId, person);
        }
      });
    }
  };

  const saveBank = async (_user: UserInterface, person: PersonInterface) => {
    if (!stripe) {
      setErrors(["Payment processing unavailable"]);
      setProcessing(false);
      return;
    }

    setBankConnecting(true);

    try {
      // Get ACH setup intent from anonymous endpoint
      const setupResponse = await ApiHelper.postAnonymous("/paymentmethods/ach-setup-intent-anon", {
        email,
        name: `${firstName} ${lastName}`,
        churchId: props.churchId,
        gatewayId: gateway?.id
      }, "GivingApi");

      if (setupResponse?.error) {
        setErrors([setupResponse.error]);
        setProcessing(false);
        setBankConnecting(false);
        return;
      }

      // Use Financial Connections to collect bank account
      const { error: collectError, setupIntent: collectedSetupIntent } = await stripe.collectBankAccountForSetup({
        clientSecret: setupResponse.clientSecret,
        params: {
          payment_method_type: "us_bank_account",
          payment_method_data: {
            billing_details: {
              name: `${firstName} ${lastName}`,
              email
            }
          }
        }
      });

      if (collectError) {
        setErrors([collectError.message || "Failed to connect bank account"]);
        setProcessing(false);
        setBankConnecting(false);
        return;
      }

      // Check if user completed the flow
      if (!collectedSetupIntent?.payment_method) {
        setErrors(["Bank account connection was not completed. Please try again."]);
        setProcessing(false);
        setBankConnecting(false);
        return;
      }

      // Confirm the SetupIntent
      const { error: confirmError, setupIntent } = await stripe.confirmUsBankAccountSetup(setupResponse.clientSecret);

      if (confirmError) {
        setErrors([confirmError.message || "Failed to confirm bank account"]);
        setProcessing(false);
        setBankConnecting(false);
        return;
      }

      setBankConnecting(false);

      // Process the donation
      const donation: StripeDonationInterface = {
        amount: total,
        id: setupIntent?.payment_method as string,
        customerId: setupResponse.customerId,
        type: "bank",
        churchId: props.churchId,
        funds: fundDonations.map(fd => ({ id: fd.fundId || "", amount: fd.amount || 0 })),
        person: {
          id: person?.id || "",
          email: person?.contactInfo?.email || "",
          name: person?.name?.display || ""
        },
        notes
      };

      const churchObj = {
        name: church?.name || "",
        subDomain: church?.subDomain || "",
        churchURL: typeof window !== "undefined" ? window.location.origin : "",
        logo: props?.churchLogo || ""
      };

      const results = await ApiHelper.post("/donate/charge", {
        ...donation,
        church: churchObj,
        provider: "stripe",
        gatewayId: gateway?.id,
        currency: gateway?.currency || "USD"
      }, "GivingApi");

      if (results?.status === "succeeded" || results?.status === "pending" || results?.status === "processing") {
        setDonationComplete(true);
      } else {
        setErrors([results?.raw?.message || results?.error || "An unexpected error occurred"]);
      }
    } catch (error: any) {
      setErrors([error.message || "Error processing bank donation"]);
    }

    setProcessing(false);
    setBankConnecting(false);
  };

  const saveDonation = async (paymentMethod: StripePaymentMethod, customerId: string, person?: PersonInterface) => {
    const donation: StripeDonationInterface = {
      amount: total,
      id: paymentMethod.id,
      customerId: customerId,
      type: paymentMethod.type,
      churchId: props.churchId,
      funds: [],
      person: {
        id: person?.id || "",
        email: person?.contactInfo?.email || "",
        name: person?.name?.display || ""
      },
      notes: notes
    };

    if (donationType === "recurring") {
      donation.billing_cycle_anchor = startDate ? + new Date(startDate) : + new Date();
      donation.interval = DonationHelper.getInterval(interval);
    }

    for (const fundDonation of fundDonations) {
      if (donation.funds) {
        donation.funds.push({ id: fundDonation.fundId || "", amount: fundDonation.amount || 0 });
      }
    }

    const churchObj = {
      name: church?.name || "",
      subDomain: church?.subDomain || "",
      churchURL: typeof window !== "undefined" ? window.location.origin : "",
      logo: props?.churchLogo || ""
    };

    let results;
    const donationPayload = {
      ...donation,
      church: churchObj,
      provider: gateway?.provider || "stripe",
      gatewayId: gateway?.id,
      currency: gateway?.currency || "USD"
    };
    if (donationType === "once") results = await ApiHelper.post("/donate/charge", donationPayload, "GivingApi");
    if (donationType === "recurring") results = await ApiHelper.post("/donate/subscribe", donationPayload, "GivingApi");

    // Handle 3D Secure authentication if required
    const threeDSResult = await DonationHelper.handle3DSIfRequired(results, stripe);
    if (threeDSResult.requiresAction) {
      if (threeDSResult.success) {
        setDonationComplete(true);
      } else {
        setErrors([threeDSResult.error || "Authentication failed."]);
      }
      setProcessing(false);
      return;
    }

    if (results?.status === "succeeded" || results?.status === "pending" || results?.status === "active" || results?.status === "processing") {
      setDonationComplete(true);
    } else {
      // Handle any error case
      if (results?.raw?.message) {
        setErrors([results?.raw?.message]);
      } else if (results?.error) {
        setErrors([results.error]);
      } else {
        setErrors(["An unexpected error occurred. Please try again."]);
      }
    }
    setProcessing(false);
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
    //Todo - make sure the account doesn't exist. (loadOrCreate?)
    setErrors(result);
    return result.length === 0;
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
    const selectedFunds: any[] = [];
    for (const fundDonation of fd) {
      totalAmount += fundDonation.amount || 0;
      const fund = funds.find((fund: FundInterface) => fund.id === fundDonation.fundId);
      selectedFunds.push({ id: fundDonation.fundId, amount: fundDonation.amount || 0, name: fund?.name || "" });
    }
    setFundsTotal(totalAmount);

    const fee = await getTransactionFee(totalAmount);
    setTransactionFee(fee);

    if (gateway?.payFees === true) {
      setTotal(totalAmount + fee);
    } else {
      // If the checkbox is checked, include the fee in the total
      setTotal(coverFees ? totalAmount + fee : totalAmount);
    }
  };

  const getTransactionFee = async (amount: number) => {
    if (amount > 0) {
      try {
        const response = await ApiHelper.post(
          "/donate/fee?churchId=" + props.churchId,
          { amount, provider: gateway?.provider || "stripe", gatewayId: gateway?.id, currency: gateway?.currency || "USD", ...(props.paymentType === "bank" ? { type: "ach" } : {}) },
          "GivingApi"
        );
        return response.calculatedFee;
      } catch (error) {
        return 0;
      }
    } else {
      return 0;
    }
  };

  const getFundList = () => {
    if (funds) {
      return (<>
				<hr />
				<h4>{Locale.label("donation.donationForm.funds")}</h4>
				<FundDonations fundDonations={fundDonations} funds={funds} params={searchParams} updatedFunction={handleFundDonationsChange} currency={gateway?.currency} />
			</>);
    }
  };

	useEffect(init, []); //eslint-disable-line


  if (donationComplete) return <Alert severity="success">{Locale.label("donation.donationForm.thankYou")}</Alert>;
  else {
    return (
      <InputBox headerIcon={showHeader ? "volunteer_activism" : ""} headerText={showHeader ? "Donate" : ""} saveFunction={handleSave} saveText="Donate" isSubmitting={processing || bankConnecting} mainContainerCssProps={mainContainerCssProps}>
        <ErrorMessages errors={errors} />
        <Grid container spacing={3}>
          {/* Only show recurring option for card payments */}
          {paymentType !== "bank" && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button aria-label="single-donation" size="small" fullWidth style={{ minHeight: "50px" }} variant={donationType === "once" ? "contained" : "outlined"} onClick={() => setDonationType("once")}>{Locale.label("donation.donationForm.make")}</Button>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button aria-label="recurring-donation" size="small" fullWidth style={{ minHeight: "50px" }} variant={donationType === "recurring" ? "contained" : "outlined"} onClick={() => setDonationType("recurring")}>{Locale.label("donation.donationForm.makeRecurring")}</Button>
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
          {!bypassRecaptcha && (
            <Grid size={{ xs: 12, md: 6 }}>
              <ReCAPTCHA
                sitekey={props.recaptchaSiteKey}
                ref={captchaRef}
                onChange={handleCaptchaChange}
                onExpired={() => {
                  setCaptchaResponse("");
                }}
                onErrored={() => {
                  setCaptchaResponse("error");
                }}
              />
            </Grid>
          )}
        </Grid>
        {/* Show bank connection UI or card elements based on payment type */}
        {gateway?.provider?.toLowerCase() === "stripe" && paymentType === "bank" ? (
          <Box sx={{ textAlign: "center", py: 3, px: 2, mt: 2, border: "1px solid #CCC", borderRadius: 1 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Securely connect your bank account using Stripe Financial Connections.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You'll log in to your bank to authorize the connection. Your credentials are never shared.
            </Typography>
            {bankConnecting && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mt: 2 }}>
                <CircularProgress size={24} />
                <Typography>Connecting to your bank...</Typography>
              </Box>
            )}
          </Box>
        ) : gateway?.provider?.toLowerCase() === "stripe" && (
          <Grid container spacing={3} style={{ marginTop: 10 }}>
            <Grid size={12}>
              <div style={{ padding: 10, border: "1px solid #CCC", borderRadius: 5 }}>
                <CardNumberElement options={formStyling} />
              </div>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <div style={{ padding: 10, border: "1px solid #CCC", borderRadius: 5 }}>
                <CardExpiryElement options={formStyling} />
              </div>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <div style={{ padding: 10, border: "1px solid #CCC", borderRadius: 5 }}>
                <CardCvcElement options={formStyling} />
              </div>
            </Grid>
          </Grid>
        )}
        {donationType === "recurring" && paymentType !== "bank"
        && <Grid container spacing={3} style={{ marginTop: 0 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{Locale.label("donation.donationForm.frequency")}</InputLabel>
                <Select label="Frequency" name="interval" aria-label="interval" value={interval} onChange={(e) => { setInterval(e.target.value); }}>
                  <MenuItem value="one_week">{Locale.label("donation.donationForm.weekly")}</MenuItem>
                  <MenuItem value="two_week">{Locale.label("donation.donationForm.biWeekly")}</MenuItem>
                  <MenuItem value="one_month">{Locale.label("donation.donationForm.monthly")}</MenuItem>
                  <MenuItem value="three_month">{Locale.label("donation.donationForm.quarterly")}</MenuItem>
                  <MenuItem value="one_year">{Locale.label("donation.donationForm.annually")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth name="startDate" type="date" aria-label="startDate" label={Locale.label("donation.donationForm.startDate")} value={DateHelper.formatHtml5Date(startDate ? new Date(startDate) : new Date())} onChange={handleChange} />
            </Grid>
          </Grid>
        }
        {getFundList()}
        <TextField fullWidth label="Memo (optional)" multiline aria-label="note" name="notes" value={notes} onChange={handleChange} style={{ marginTop: 10, marginBottom: 10 }} />
        <div>
          {fundsTotal > 0
            && <>
              {(gateway?.payFees === true)
                ? <Typography fontSize={14} fontStyle="italic">*{Locale.label("donation.donationForm.fees").replace("{}", CurrencyHelper.formatCurrencyWithLocale(transactionFee, gateway?.currency || "USD"))}</Typography>
                : (
                <FormGroup>
                  <FormControlLabel control={<Checkbox checked={coverFees} />} name="transaction-fee" label={Locale.label("donation.donationForm.cover").replace("{}", CurrencyHelper.formatCurrencyWithLocale(transactionFee, gateway?.currency || "USD"))} onChange={handleCheckChange} />
                </FormGroup>
                )}
              <p>Total Donation Amount: {CurrencyHelper.formatCurrencyWithLocale(total, gateway?.currency || "USD")}</p>
            </>
          }
        </div>
      </InputBox>
    );
  }
};
