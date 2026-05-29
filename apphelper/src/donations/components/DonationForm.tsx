"use client";


import React, { useCallback, useState, useEffect } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { useStripe } from "@stripe/react-stripe-js";
import { InputBox, ErrorMessages } from "../..";
import { FundDonations } from ".";
import { DonationPreviewModal } from "../modals/DonationPreviewModal";
import { ApiHelper, CurrencyHelper, DateHelper } from "@churchapps/helpers";
import { Locale, DonationHelper, StripePaymentMethod, PaymentGateway } from "../helpers";
import { PersonInterface, StripeDonationInterface, FundDonationInterface, FundInterface, ChurchInterface } from "@churchapps/helpers";
import { Grid, InputLabel, MenuItem, Select, TextField, FormControl, Button, FormControlLabel, Checkbox, FormGroup, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

interface Props { person: PersonInterface, customerId: string, paymentMethods: StripePaymentMethod[], stripePromise: Promise<Stripe>, donationSuccess: (message: string) => void, church?: ChurchInterface, churchLogo?: string, currency?: string }

export const DonationForm: React.FC<Props> = ({ currency = "usd", ...props }) => {
  const stripe = useStripe();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [fundDonations, setFundDonations] = useState<FundDonationInterface[]>();
  const [funds, setFunds] = useState<FundInterface[]>([]);
  const [fundsTotal, setFundsTotal] = useState<number>(0);
  const [transactionFee, setTransactionFee] = useState<number>(0);
  const [payFee, setPayFee] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [paymentMethodName, setPaymentMethodName] = useState<string>(
    props?.paymentMethods?.length > 0 ? `${props.paymentMethods[0].name} ****${props.paymentMethods[0].last4}` : ""
  );
  const [donationType, setDonationType] = useState<string | undefined>("once");
  const [showDonationPreviewModal, setShowDonationPreviewModal] = useState<boolean>(false);
  const [interval, setInterval] = useState("one_month");
  const [gateway, setGateway] = useState<PaymentGateway | null>(null);
  const [donation, setDonation] = useState<StripeDonationInterface>({
    id: props?.paymentMethods?.length > 0 ? props.paymentMethods[0].id : "",
    type: props?.paymentMethods?.length > 0 ? props.paymentMethods[0].type : "",
    customerId: props.customerId,
    person: {
      id: props.person?.id || "",
      email: props.person?.contactInfo?.email || "",
      name: props.person?.name?.display || ""
    },
    amount: 0,
    billing_cycle_anchor: + new Date(),
    interval: {
      interval_count: 1,
      interval: "month"
    },
    funds: []
  });

  const loadData = useCallback(() => {
    ApiHelper.get("/funds", "GivingApi").then((data: any) => {
      setFunds(data);
      if (data.length) setFundDonations([{ fundId: data[0].id }]);
    });
    ApiHelper.get(`/donate/gateways/${props?.church?.id || ""}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const stripeGateway = gateways.find((g: any) => DonationHelper.isProvider(g.provider, "stripe"));
      if (stripeGateway) setGateway(stripeGateway);
    });
  }, []);

  const handleSave = useCallback(() => {
    if ((donation.amount ?? 0) < .5) setErrorMessage(Locale.label("donation.donationForm.tooLow"));
    else setShowDonationPreviewModal(true);
  }, [donation.amount]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<any>) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }, [handleSave]);

  const handleCheckChange = useCallback((_e: React.SyntheticEvent<Element, Event>, checked: boolean) => {
    const d = { ...donation } as StripeDonationInterface;
    d.amount = checked ? fundsTotal + transactionFee : fundsTotal;
    const showFee = checked ? transactionFee : 0;
    setTotal(d.amount);
    setPayFee(showFee);
    setDonation(d);
  }, [donation, fundsTotal, transactionFee]);


  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    setErrorMessage(undefined);
    const d = { ...donation } as StripeDonationInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "method":
        d.id = value;
        const pm = props.paymentMethods.find(pm => pm.id === value);
        if (pm) {
          d.type = pm.type;
          setPaymentMethodName(`${pm.name} ****${pm.last4}`);
        }
        break;
      case "type": setDonationType(value); break;
      case "date": d.billing_cycle_anchor = value ? + new Date(value) : + new Date(); break;
      case "interval":
        setInterval(value);
        d.interval = DonationHelper.getInterval(value);
        break;
      case "notes": d.notes = value; break;
      case "transaction-fee":
        const element = e.target as HTMLInputElement;
        d.amount = element.checked ? fundsTotal + transactionFee : fundsTotal;
        const showFee = element.checked ? transactionFee : 0;
        setTotal(d.amount);
        setPayFee(showFee);
    }
    setDonation(d);
  }, [donation, props.paymentMethods, fundsTotal, transactionFee, gateway?.id]);

  const handleCancel = useCallback(() => { setDonationType(undefined); }, []);
  const handleDonationSelect = useCallback((type: string) => {
    const dt = donationType === type ? undefined : type;
    setDonationType(dt);
  }, [donationType]);

  const handleSingleDonationClick = useCallback(() => handleDonationSelect("once"), [handleDonationSelect]);
  const handleRecurringDonationClick = useCallback(() => handleDonationSelect("recurring"), [handleDonationSelect]);

  const makeDonation = useCallback(async (message: string) => {
    let results;

    const churchObj = {
      name: props?.church?.name || "",
      subDomain: props?.church?.subDomain || "",
      churchURL: typeof window !== "undefined" ? window.location.origin : "",
      logo: props?.churchLogo || ""
    };

    const selectedPaymentMethod = props.paymentMethods.find(pm => pm.id === donation.id);
    const payload = {
      ...donation,
      provider: selectedPaymentMethod?.provider || "stripe",
      gatewayId: selectedPaymentMethod?.gatewayId || gateway?.id,
      church: churchObj
    };

    if (donationType === "once") results = await ApiHelper.post("/donate/charge", payload, "GivingApi");
    if (donationType === "recurring") results = await ApiHelper.post("/donate/subscribe", payload, "GivingApi");

    // Handle 3D Secure authentication if required
    const threeDSResult = await DonationHelper.handle3DSIfRequired(results, stripe);
    if (threeDSResult.requiresAction) {
      setShowDonationPreviewModal(false);
      if (threeDSResult.success) {
        setDonationType(undefined);
        props.donationSuccess(message);
      } else {
        setErrorMessage(Locale.label("donation.common.error") + ": " + threeDSResult.error);
      }
      return;
    }

    if (results?.status === "succeeded" || results?.status === "pending" || results?.status === "active" || results?.status === "processing") {
      setShowDonationPreviewModal(false);
      setDonationType(undefined);
      props.donationSuccess(message);
    } else {
      // Handle any error case
      setShowDonationPreviewModal(false);
      if (results?.raw?.message) {
        setErrorMessage(Locale.label("donation.common.error") + ": " + results?.raw?.message);
      } else if (results?.error) {
        setErrorMessage(Locale.label("donation.common.error") + ": " + results.error);
      } else {
        setErrorMessage(Locale.label("donation.common.error") + ": An unexpected error occurred. Please try again.");
      }
    }
  }, [
    donation, donationType, gateway?.id, props.church?.name, props.church?.subDomain, props.churchLogo, props.donationSuccess, stripe, props.paymentMethods
  ]);

  const handleFundDonationsChange = useCallback(async (fd: FundDonationInterface[]) => {
    setErrorMessage(undefined);
    setFundDonations(fd);
    let totalAmount = 0;
    const selectedFunds: any = [];
    for (const fundDonation of fd) {
      totalAmount += fundDonation.amount || 0;
      const fund = funds.find((fund: FundInterface) => fund.id === fundDonation.fundId);
      if (fund) {
        selectedFunds.push({ id: fundDonation.fundId, amount: fundDonation.amount || 0, name: fund.name });
      }
    }
    const d = { ...donation };
    d.amount = totalAmount;
    d.funds = selectedFunds;
    setFundsTotal(totalAmount);

    const selectedPm = props.paymentMethods.find(pm => pm.id === d.id);
    const fee = await getTransactionFee(totalAmount, (selectedPm?.gatewayId || gateway?.id) as string | undefined, (selectedPm?.provider as "stripe" | "paypal") || "stripe", selectedPm?.type);
    setTransactionFee(fee);

    if (gateway && gateway.payFees === true) {
      d.amount = totalAmount + fee;
      setPayFee(fee);
    }
    setTotal(d.amount ?? 0);
    setDonation(d);
  }, [donation, funds, gateway]);

  const getTransactionFee = useCallback(async (amount: number, activeGatewayId?: string, provider: "stripe" | "paypal" = "stripe", paymentMethodType?: "card" | "bank" | "paypal") => {
    if (amount > 0) {
      try {
        const payload: any = { amount, provider, gatewayId: activeGatewayId };
        if (paymentMethodType === "bank") payload.type = "ach";
        const response = await ApiHelper.post(
          "/donate/fee?churchId=" + (props?.church?.id || ""),
          payload,
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
  }, [props?.church?.id]);

  useEffect(() => {
    loadData();
  }, [loadData, props.person?.id]);

  useEffect(() => {
    if (gateway?.id) {
      // Gateway is stored at the component level, not in the donation object
      setGateway(gateway);
    }
  }, [gateway?.id]);


  if (!funds.length || !props?.paymentMethods?.length) return null;

  return (
    <>
      <DonationPreviewModal show={showDonationPreviewModal} onHide={() => setShowDonationPreviewModal(false)} handleDonate={makeDonation} donation={donation} donationType={donationType || ""} payFee={payFee} paymentMethodName={paymentMethodName} funds={funds} />
      <InputBox id="donation-form" aria-label="donation-box" headerIcon="volunteer_activism" headerText={Locale.label("donation.donationForm.donate")} ariaLabelSave="save-button" cancelFunction={donationType ? handleCancel : undefined} saveFunction={donationType ? handleSave : undefined} saveText={Locale.label("donation.donationForm.preview")}>
        <Grid id="donation-type-selector" container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button id="single-donation-button" aria-label="single-donation" size="small" fullWidth style={{ minHeight: "50px" }} variant={donationType === "once" ? "contained" : "outlined"} onClick={handleSingleDonationClick}>{Locale.label("donation.donationForm.make")}</Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button id="recurring-donation-button" aria-label="recurring-donation" size="small" fullWidth style={{ minHeight: "50px" }} variant={donationType === "recurring" ? "contained" : "outlined"} onClick={handleRecurringDonationClick}>{Locale.label("donation.donationForm.makeRecurring")}</Button>
          </Grid>
        </Grid>
        {donationType && (
          <div id="donation-details" style={{ marginTop: "20px" }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("donation.donationForm.method")}</InputLabel>
                  <Select id="payment-method-select" label={Locale.label("donation.donationForm.method")} name="method" aria-label="method" value={donation.id} className="capitalize" onChange={handleChange}>
                    {props.paymentMethods.map((paymentMethod: any) => <MenuItem key={paymentMethod.id} value={paymentMethod.id}>{paymentMethod.name} ****{paymentMethod.last4}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            {donationType === "recurring" && (
              <Grid container spacing={3} style={{ marginTop: 10 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField id="start-date-field" fullWidth name="date" type="date" aria-label="date" label={Locale.label("donation.donationForm.startDate")} value={DateHelper.formatHtml5Date(new Date(donation.billing_cycle_anchor || Date.now()))} onChange={handleChange} onKeyDown={handleKeyDown} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>{Locale.label("donation.donationForm.frequency")}</InputLabel>
                    <Select id="frequency-select" label={Locale.label("donation.donationForm.frequency")} name="interval" aria-label="interval" value={interval} onChange={handleChange}>
                      <MenuItem value="one_week">{Locale.label("donation.donationForm.weekly")}</MenuItem>
                      <MenuItem value="two_week">{Locale.label("donation.donationForm.biWeekly")}</MenuItem>
                      <MenuItem value="one_month">{Locale.label("donation.donationForm.monthly")}</MenuItem>
                      <MenuItem value="three_month">{Locale.label("donation.donationForm.quarterly")}</MenuItem>
                      <MenuItem value="one_year">{Locale.label("donation.donationForm.annually")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
            <div id="fund-selection" className="form-group">
              {funds && fundDonations && (
                <>
                  <h4>{Locale.label("donation.donationForm.fund")}</h4>
                  <FundDonations fundDonations={fundDonations} funds={funds} updatedFunction={handleFundDonationsChange} currency={currency} />
                </>
              )}
              {fundsTotal > 0 && (
                <>
                  {(gateway && gateway.payFees === true) ? <Typography fontSize={14} fontStyle="italic">*{Locale.label("donation.donationForm.fees").replace("{}", CurrencyHelper.formatCurrencyWithLocale(transactionFee, currency))}</Typography> : (
                    <FormGroup>
                      <FormControlLabel control={<Checkbox />} name="transaction-fee" label={Locale.label("donation.donationForm.cover").replace("{}", CurrencyHelper.formatCurrencyWithLocale(transactionFee, currency))} onChange={handleCheckChange} />
                    </FormGroup>
                  )}
                  <p>{Locale.label("donation.donationForm.total")}: {CurrencyHelper.getCurrencySymbol(currency)}{total}</p>
                </>
              )}
              <TextField id="donation-notes" fullWidth label="Memo (optional)" multiline aria-label="note" name="notes" value={donation.notes || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
            </div>
            {errorMessage && <ErrorMessages errors={[errorMessage]}></ErrorMessages>}
          </div>
        )}
      </InputBox>
    </>
  );
};
