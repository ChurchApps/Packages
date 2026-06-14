"use client";

import React, { useState, useRef, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { ErrorMessages, InputBox } from "../..";
import { FundDonations } from ".";
// PayPal Hosted Fields for secure card entry
import { PayPalHostedFields, PayPalHostedFieldsHandle } from "./PayPalHostedFields";
import { ApiHelper, DateHelper, CurrencyHelper } from "@churchapps/helpers";
import { Locale, DonationHelper, PayPalDonationInterface } from "../helpers";
import { FundDonationInterface, FundInterface, PersonInterface, UserInterface, ChurchInterface } from "@churchapps/helpers";
import { Grid, Alert, TextField, Button, FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel, Checkbox, Typography } from "@mui/material";
import type { PaperProps } from "@mui/material/Paper";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
  paypalClientId: string | null;
  allowSingleGift?: boolean;
  allowRecurring?: boolean;
  showFundSelector?: boolean;
  allowedFundIds?: string[];
  defaultFundId?: string;
}

export const PayPalNonAuthDonationInner: React.FC<Props> = ({ mainContainerCssProps, showHeader = true, ...props }) => {
  const allowSingleGift = props.allowSingleGift !== false;
  const allowRecurring = props.allowRecurring !== false;
  const showFundSelector = props.showFundSelector !== false;
  const allowedFundIds = Array.isArray(props.allowedFundIds) ? props.allowedFundIds : [];

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
  const [donationType, setDonationType] = useState<"once" | "recurring">(allowSingleGift ? "once" : (allowRecurring ? "recurring" : "once"));
  const [interval, setInterval] = useState("one_month");
  const [startDate, setStartDate] = useState(new Date().toDateString());
  const bypassRecaptcha = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BYPASS_RECAPTCHA === "true";
  const [_captchaResponse, setCaptchaResponse] = useState(bypassRecaptcha ? "success" : "");
  // Keep church for potential future metadata usage
  const [_church, _setChurch] = useState<ChurchInterface>();
  const [gateway, setGateway] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [coverFees, setCoverFees] = useState(false);
  const hostedFieldsRef = useRef<PayPalHostedFieldsHandle>(null);
  const [hostedValid, setHostedValid] = useState<boolean>(false);
  const [useHostedFields, setUseHostedFields] = useState<boolean>(true);
  const captchaRef = useRef<ReCAPTCHA>(null);

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
      const filteredFunds: FundInterface[] = allowedFundIds.length > 0
        ? (data || []).filter((f: FundInterface) => allowedFundIds.includes(f.id))
        : (data || []);
      setFunds(filteredFunds);
      const preferredId = props.defaultFundId
        || (fundId && fundId !== "" ? fundId : "")
        || (filteredFunds.length > 0 ? filteredFunds[0].id : "");
      const initialFund = filteredFunds.find((f: FundInterface) => f.id === preferredId);
      if (initialFund) {
        setFundDonations([{ fundId: initialFund.id, amount: (amount && amount !== "") ? parseFloat(amount) : 0 }]);
      }
    });
    ApiHelper.get("/churches/" + props.churchId, "MembershipApi").then((_data: any) => {
      _setChurch(_data);
    });
    ApiHelper.get(`/donate/gateways/${props.churchId}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const paypalGateway = DonationHelper.findGatewayByProvider(gateways, "paypal");
      if (paypalGateway) setGateway(paypalGateway);
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
      if (_captchaResponse !== "success") {
        setErrors(["Please complete the reCAPTCHA verification"]);
        return;
      }
      setProcessing(true);
      ApiHelper.post("/users/loadOrCreate", { userEmail: email, firstName, lastName }, "MembershipApi")
        .catch((ex: any) => { setErrors([ex.toString()]); setProcessing(false); })
        .then(async (userData: any) => {
          const personData = { churchId: props.churchId, firstName, lastName, email };
          const person = await ApiHelper.post("/people/loadOrCreate", personData, "MembershipApi");
          await savePayPalDonation(userData, person);
        });
    }
  };

  const savePayPalDonation = async (_user: UserInterface, person: PersonInterface) => {
    // Try Hosted Fields first if client ID provided
    let hostedOrderId: string | undefined;
    if (props.paypalClientId && useHostedFields) {
      try {
        const payload = await hostedFieldsRef.current?.submit();
        hostedOrderId = payload?.orderId || payload?.id;
      } catch (e) {
        console.warn("PayPal Hosted Fields submit failed or not ready. Falling back to manual card.", e);
      }
    }

    if (!hostedOrderId) {
      setErrors(["PayPal card fields are unavailable. Ensure HTTPS and that PayPal Hosted Fields are enabled."]);
      setProcessing(false);
      return;
    }

    const donation: PayPalDonationInterface = {
      id: "", // PayPal will generate this
      customerId: "", // Will be set by backend
      type: "paypal",
      provider: "paypal",
      gatewayId: gateway?.id,
      churchId: props.churchId,
      amount: total,
      funds: [],
      person: {
        id: person?.id || "",
        email: person?.contactInfo?.email || "",
        name: person?.name?.display || ""
      },
      notes: notes
    };
    // Attach hosted order id when available for backend capture
    if (hostedOrderId) (donation as any).paypalOrderId = hostedOrderId;

    if (donationType === "recurring") {
      donation.billing_cycle_anchor = startDate ? + new Date(startDate) : + new Date();
      donation.interval = DonationHelper.getInterval(interval);
    }

    for (const fundDonation of fundDonations) {
      if (donation.funds) {
        donation.funds.push({ id: fundDonation.fundId || "", amount: fundDonation.amount || 0 });
      }
    }

    // Church object is no longer required for unified PayPal capture.

    // Capture via existing /donate/charge endpoint (PayPal)
    const compactFunds = (donation.funds || []).map(f => ({ id: f.id, amount: f.amount }));
    const results = await ApiHelper.post(
      "/donate/charge",
      {
        provider: "paypal",
        gatewayId: gateway?.id,
        id: hostedOrderId,
        churchId: props.churchId,
        amount: total,
        funds: compactFunds,
        person: donation.person,
        notes
      },
      "GivingApi"
    );

    if (DonationHelper.isPayPalCaptureComplete(results?.status)) {
      setDonationComplete(true);
    } else {
      // Any non-captured status (including "CREATED") is a failure, not success.
      setErrors([results?.message || results?.error || "Payment processing failed"]);
    }
    setProcessing(false);
  };

  const validate = () => {
    const result: string[] = [];
    if (!firstName) result.push(Locale.label("donation.donationForm.validate.firstName"));
    if (!lastName) result.push(Locale.label("donation.donationForm.validate.lastName"));
    if (!email) result.push(Locale.label("donation.donationForm.validate.email"));
    if (fundsTotal === 0) result.push(Locale.label("donation.donationForm.validate.amount"));
    if (props.paypalClientId && useHostedFields) {
      if (!hostedValid) result.push("Please provide valid card information");
    } else result.push("PayPal Hosted Fields not available");

    if (result.length === 0) {
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) result.push(Locale.label("donation.donationForm.validate.validEmail"));
    }

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
          { amount, provider: "paypal", gatewayId: gateway?.id },
          "GivingApi"
        );
        return response.calculatedFee;
      } catch (error) {
        console.log("Error calculating transaction fee: ", error);
        return 0;
      }
    } else {
      return 0;
    }
  };

  const getFundList = () => {
    if (!funds) return null;
    if (showFundSelector) {
      return (<>
        <hr />
        <h4>{Locale.label("donation.donationForm.funds")}</h4>
        <FundDonations fundDonations={fundDonations} funds={funds} params={searchParams} updatedFunction={handleFundDonationsChange} />
      </>);
    }
    return (<>
      <hr />
      <FundDonations fundDonations={fundDonations} funds={funds} params={searchParams} updatedFunction={handleFundDonationsChange} hideFundSelect={true} />
    </>);
  };

  useEffect(init, []);

  if (donationComplete) return <Alert severity="success">{Locale.label("donation.donationForm.thankYou")}</Alert>;
  else {
    return (
      <InputBox headerIcon={showHeader ? "volunteer_activism" : ""} headerText={showHeader ? "Donate with PayPal" : ""} saveFunction={handleSave} saveText="Donate" isSubmitting={processing} mainContainerCssProps={mainContainerCssProps}>
        <ErrorMessages errors={errors} />
        <Grid container spacing={3}>
          {allowSingleGift && allowRecurring && (
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
          <Grid size={{ xs: 12, md: 6 }}>
            <ReCAPTCHA
              sitekey={props.recaptchaSiteKey}
              ref={captchaRef}
              onChange={handleCaptchaChange}
              onExpired={() => {
                console.log("Captcha expired");
                setCaptchaResponse("");
              }}
              onErrored={() => {
                console.log("Captcha error");
                setCaptchaResponse("error");
              }}
            />
          </Grid>
        </Grid>
        {/* Use PayPal Hosted Fields only (no fallback form) */}
        {props.paypalClientId && useHostedFields ? (
          <PayPalHostedFields
            ref={hostedFieldsRef}
            clientId={props.paypalClientId}
            getClientToken={async () => {
              try {
                const resp = await ApiHelper.post(
                  "/donate/client-token",
                  { churchId: props.churchId, provider: "paypal", gatewayId: gateway?.id },
                  "GivingApi"
                );
                const token = resp?.clientToken || resp?.token || resp?.result || resp;
                return typeof token === "string" && token.length > 0 ? token : "";
              } catch {
                return "";
              }
            }}
            onValidityChange={setHostedValid}
            onIneligible={() => setUseHostedFields(false)}
            createOrder={async () => {
              // Create order on backend if supported; fallback to simple legacy flow
              try {
                const fundsPayload = (fundDonations || [])
                  .filter(fd => (fd.amount || 0) > 0 && fd.fundId)
                  .map(fd => ({ id: fd.fundId!, amount: fd.amount || 0 }));
                const response = await ApiHelper.post(
                  "/donate/create-order",
                  {
                    churchId: props.churchId,
                    provider: "paypal",
                    gatewayId: gateway?.id,
                    amount: total,
                    currency: "USD",
                    funds: fundsPayload,
                    notes
                  },
                  "GivingApi"
                );
                return response?.id || response?.orderId || "";
              } catch (e) {
                console.warn("Create PayPal order failed; Hosted Fields may not be enabled on backend.", e);
                return "";
              }
            }}
          />
        ) : (
          <Alert severity="error" sx={{ mb: 1 }}>PayPal card fields are unavailable. This requires HTTPS and an enabled PayPal merchant.</Alert>
        )}
        {donationType === "recurring"
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
                ? <Typography fontSize={14} fontStyle="italic">*{Locale.label("donation.donationForm.fees").replace("{}", CurrencyHelper.formatCurrency(transactionFee))}</Typography>
                : (
                  <FormGroup>
                    <FormControlLabel control={<Checkbox checked={coverFees} />} name="transaction-fee" label={Locale.label("donation.donationForm.cover").replace("{}", CurrencyHelper.formatCurrency(transactionFee))} onChange={handleCheckChange} />
                  </FormGroup>
                )}
              <p>Total Donation Amount: ${total}</p>
            </>
          }
        </div>
      </InputBox>
    );
  }
};
