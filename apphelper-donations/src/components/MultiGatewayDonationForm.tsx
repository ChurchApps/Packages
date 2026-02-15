"use client";

import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { useStripe } from "@stripe/react-stripe-js";
import { InputBox, ErrorMessages } from "@churchapps/apphelper";
import { FundDonations } from ".";
import { PayPalHostedFields, PayPalHostedFieldsHandle } from "./PayPalHostedFields";
import { DonationPreviewModal } from "../modals/DonationPreviewModal";
import { ApiHelper, CurrencyHelper, DateHelper } from "@churchapps/helpers";
import { Locale, DonationHelper } from "../helpers";
import type { PaymentMethod, PaymentGateway, MultiGatewayDonationInterface } from "../helpers";
import { PersonInterface, FundDonationInterface, FundInterface, ChurchInterface } from "@churchapps/helpers";
import {
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  FormControl,
  Button,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Typography,
  Alert
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

interface Props {
  person: PersonInterface;
  customerId: string;
  paymentMethods: PaymentMethod[];
  paymentGateways: PaymentGateway[];
  stripePromise?: Promise<Stripe>;
  donationSuccess: (message: string) => void;
  church?: ChurchInterface;
  churchLogo?: string;
}

export const MultiGatewayDonationForm: React.FC<Props> = (props) => {
  const stripe = useStripe();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [fundDonations, setFundDonations] = useState<FundDonationInterface[]>();
  const [funds, setFunds] = useState<FundInterface[]>([]);
  const [fundsLoaded, setFundsLoaded] = useState<boolean>(false);
  const [fundsTotal, setFundsTotal] = useState<number>(0);
  const [transactionFee, setTransactionFee] = useState<number>(0);
  const [payFee, setPayFee] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [paymentMethodName, setPaymentMethodName] = useState<string>(
    props?.paymentMethods?.length > 0 ? `${props.paymentMethods[0].name} ${props.paymentMethods[0].last4 ? `****${props.paymentMethods[0].last4}` : props.paymentMethods[0].email || ""}` : ""
  );
  const [selectedGateway, setSelectedGateway] = useState<string>(
    DonationHelper.normalizeProvider(props?.paymentGateways?.find(g => g.enabled !== false)?.provider || "stripe")
  );
  const selectedGatewayObj = useMemo(() => {
    return (
      props.paymentGateways.find((g) => DonationHelper.normalizeProvider(g.provider) === selectedGateway) || null
    );
  }, [props.paymentGateways, selectedGateway]);
  const [donationType, setDonationType] = useState<string | undefined>("once");
  const [showDonationPreviewModal, setShowDonationPreviewModal] = useState<boolean>(false);
  const [interval, setInterval] = useState("one_month");
  const [gateway, setGateway] = useState<PaymentGateway | null>(selectedGatewayObj);
  const paypalClientId = useMemo(() => {
    const gw = props.paymentGateways.find(g => DonationHelper.isProvider(g.provider, "paypal"));
    return gw?.publicKey || "";
  }, [props.paymentGateways]);
  const hostedRef = useRef<PayPalHostedFieldsHandle>(null);
  const feeTimeoutRef = useRef<number | null>(null);
  const [donation, setDonation] = useState<MultiGatewayDonationInterface>({
    id: props?.paymentMethods?.length > 0 ? props.paymentMethods[0].id : "",
    type: props?.paymentMethods?.length > 0 ? (props.paymentMethods[0].type as "card" | "bank" | "paypal") : "card",
    provider: props?.paymentMethods?.length > 0
      ? DonationHelper.normalizeProvider(props.paymentMethods[0].provider) as "stripe" | "paypal"
      : (selectedGateway as "stripe" | "paypal"),
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
    funds: [],
    gatewayId: props?.paymentMethods?.length > 0 ? props.paymentMethods[0].gatewayId : selectedGatewayObj?.id
  });

  const loadFunds = useCallback(async () => {
    setFundsLoaded(false);
    try {
      const data = await ApiHelper.get("/funds", "GivingApi");
      const fundList = Array.isArray(data) ? data : [];
      setFunds(fundList);
      if (fundList.length) setFundDonations([{ fundId: fundList[0].id }]);
      else setFundDonations([]);
    } catch (_error) {
      setFunds([]);
      setFundDonations([]);
    } finally {
      setFundsLoaded(true);
    }
  }, []);

  const loadGateway = useCallback(async () => {
    try {
      const response = await ApiHelper.get(`/donate/gateways/${props?.church?.id || ""}`, "GivingApi");
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const primaryGateway = gateways.find((g: any) => DonationHelper.normalizeProvider(g.provider) === selectedGateway);
      if (primaryGateway) setGateway(primaryGateway);
    } catch (_error) {
      // ignore gateway load errors; component will handle gracefully
    }
  }, [props?.church?.id, selectedGateway]);

  const handleSave = useCallback(() => {
    if (donation.amount < .5) setErrorMessage(Locale.label("donation.donationForm.tooLow"));
    else setShowDonationPreviewModal(true);
  }, [donation.amount]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<any>) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }, [handleSave]);

  const handleCheckChange = useCallback((_e: React.SyntheticEvent<Element, Event>, checked: boolean) => {
    const d = { ...donation } as MultiGatewayDonationInterface;
    d.amount = checked ? fundsTotal + transactionFee : fundsTotal;
    const showFee = checked ? transactionFee : 0;
    setTotal(d.amount);
    setPayFee(showFee);
    setDonation(d);
  }, [donation, fundsTotal, transactionFee]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    setErrorMessage(undefined);
    const d = { ...donation } as MultiGatewayDonationInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "gateway":
        setSelectedGateway(value);
        d.provider = value as "stripe" | "paypal";
        const matchedGateway = props.paymentGateways.find(g => DonationHelper.normalizeProvider(g.provider) === value);
        d.gatewayId = matchedGateway?.id;
        // Reset payment method when changing gateways
        const availableMethods = props.paymentMethods.filter(pm => DonationHelper.normalizeProvider(pm.provider) === value);
        if (availableMethods.length > 0) {
          d.id = availableMethods[0].id;
          d.type = availableMethods[0].type as "card" | "bank" | "paypal";
          setPaymentMethodName(`${availableMethods[0].name} ${availableMethods[0].last4 ? `****${availableMethods[0].last4}` : availableMethods[0].email || ""}`);
        } else {
          d.id = "";
          if (value === "paypal") d.type = "paypal";
        }
        break;
      case "method":
        d.id = value;
        const pm = props.paymentMethods.find(pm => pm.id === value);
        if (pm) {
          d.type = pm.type as "card" | "bank" | "paypal";
          d.provider = DonationHelper.normalizeProvider(pm.provider) as "stripe" | "paypal";
          d.gatewayId = pm.gatewayId || gateway?.id || selectedGatewayObj?.id;
          setPaymentMethodName(`${pm.name} ${pm.last4 ? `****${pm.last4}` : pm.email || ""}`);
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
  }, [donation, props.paymentMethods, fundsTotal, transactionFee, gateway?.id, props.paymentGateways, selectedGatewayObj?.id]);

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

    // If using PayPal without a saved method, try Hosted Fields
    if (selectedGateway === "paypal" && (!donation.id || donation.id === "") && paypalClientId) {
      try {
        const payload = await hostedRef.current?.submit();
        const orderId = (payload as any)?.orderId || (payload as any)?.id || "";
        if (orderId) {
          // Capture and persist via unified /donate/charge endpoint for PayPal
          const compactFunds = (donation.funds || []).map((f: any) => ({ id: f.id, amount: f.amount }));
          results = await ApiHelper.post(
            "/donate/charge",
            {
              provider: "paypal",
              gatewayId: selectedGatewayObj?.id,
              id: orderId,
              churchId: props?.church?.id || "",
              amount: total,
              funds: compactFunds,
              person: donation.person,
              notes: donation?.notes || ""
            },
            "GivingApi"
          );
        }
      } catch (e) {
        console.warn("Hosted Fields submit failed, falling back to standard flow.", e);
      }
    }

    // Standard flow (Stripe or saved payment method)
    if (!results) {
      const payload = {
        ...donation,
        provider: donation.provider || (selectedGateway as "stripe" | "paypal"),
        gatewayId: donation.gatewayId || gateway?.id || selectedGatewayObj?.id,
        church: churchObj
      };
      if (donationType === "once") results = await ApiHelper.post("/donate/charge", payload, "GivingApi");
      if (donationType === "recurring") results = await ApiHelper.post("/donate/subscribe", payload, "GivingApi");
    }

    // Handle 3D Secure authentication if required (Stripe only)
    if (selectedGateway === "stripe") {
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
    }

    if (results?.status === "succeeded" || results?.status === "pending" || results?.status === "active" || results?.status === "processing" || results?.status === "CREATED") {
      setShowDonationPreviewModal(false);
      setDonationType(undefined);
      props.donationSuccess(message);
    }
    if (results?.raw?.message || results?.message) {
      setShowDonationPreviewModal(false);
      setErrorMessage(Locale.label("donation.common.error") + ": " + (results?.raw?.message || results?.message));
    }
  }, [
    donation, donationType, gateway?.id, paypalClientId, props.church?.name, props.church?.subDomain, props.churchLogo, props.donationSuccess, selectedGateway, selectedGatewayObj?.id, total, stripe
  ]);

  const getTransactionFee = useCallback(async (amount: number, activeGatewayId?: string, provider: "stripe" | "paypal" = "stripe") => {
    if (amount > 0) {
      try {
        const response = await ApiHelper.post(
          "/donate/fee?churchId=" + (props?.church?.id || ""),
          { amount, provider, gatewayId: activeGatewayId },
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

  const handleFundDonationsChange = useCallback((fd: FundDonationInterface[]) => {
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

    // Clear existing timeout
    if (feeTimeoutRef.current) {
      window.clearTimeout(feeTimeoutRef.current);
    }

    // Set initial totals without fee for immediate UI update
    setTotal(totalAmount);
    setDonation(d);

    // Debounce fee calculation to prevent excessive API calls
    feeTimeoutRef.current = window.setTimeout(async () => {
      const fee = await getTransactionFee(totalAmount, d.gatewayId || gateway?.id || selectedGatewayObj?.id, d.provider || (selectedGateway as "stripe" | "paypal"));
      setTransactionFee(fee);

      if (gateway && gateway.payFees === true) {
        const updatedAmount = totalAmount + fee;
        setTotal(updatedAmount);
        setPayFee(fee);
        setDonation(prev => ({ ...prev, amount: updatedAmount }));
      }
    }, 500);
  }, [donation, funds, gateway, selectedGatewayObj?.id, selectedGateway, getTransactionFee]);

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  useEffect(() => {
    if (props?.church?.id) {
      loadGateway();
    }
  }, [loadGateway]);

  useEffect(() => {
    if (selectedGatewayObj && (gateway?.id !== selectedGatewayObj.id)) {
      setGateway(selectedGatewayObj);
    }
  }, [selectedGatewayObj, gateway?.id]);

  useEffect(() => {
    setDonation((prev) => {
      const nextProvider = prev.provider || (selectedGateway as "stripe" | "paypal");
      const nextGatewayId = selectedGatewayObj?.id || prev.gatewayId;
      if (nextProvider === prev.provider && nextGatewayId === prev.gatewayId) return prev;
      return { ...prev, provider: nextProvider, gatewayId: nextGatewayId };
    });
  }, [selectedGateway, selectedGatewayObj?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feeTimeoutRef.current) {
        window.clearTimeout(feeTimeoutRef.current);
      }
    };
  }, []);

  const availablePaymentMethods = props.paymentMethods.filter(pm => DonationHelper.normalizeProvider(pm.provider) === selectedGateway);
  const availableGateways = props.paymentGateways.filter(g => g.enabled !== false);

  if (!fundsLoaded) {
    return <Alert severity="info">Loading donation settings…</Alert>;
  }

  if (!funds.length) {
    return (
      <Alert severity="warning">
        No donation funds have been configured for this church. Please contact your administrator.
      </Alert>
    );
  } else {
    return (
      <>
        <DonationPreviewModal
          show={showDonationPreviewModal}
          onHide={() => setShowDonationPreviewModal(false)}
          handleDonate={makeDonation}
          donation={{
            ...donation,
            person: {
              id: donation.person?.id || "",
              email: donation.person?.email || "",
              name: donation.person?.name || ""
            }
          } as any}
          donationType={donationType || ""}
          payFee={payFee}
          paymentMethodName={paymentMethodName}
          funds={funds}
        />
        <InputBox
          id="donation-form"
          aria-label="donation-box"
          headerIcon="volunteer_activism"
          headerText={Locale.label("donation.donationForm.donate")}
          ariaLabelSave="save-button"
          cancelFunction={donationType ? handleCancel : undefined}
          saveFunction={donationType ? handleSave : undefined}
          saveText={Locale.label("donation.donationForm.preview")}
        >
          <Grid id="donation-type-selector" container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Button
                id="single-donation-button"
                aria-label="single-donation"
                size="small"
                fullWidth
                style={{ minHeight: "50px" }}
                variant={donationType === "once" ? "contained" : "outlined"}
                onClick={handleSingleDonationClick}
              >
                {Locale.label("donation.donationForm.make")}
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Button
                id="recurring-donation-button"
                aria-label="recurring-donation"
                size="small"
                fullWidth
                style={{ minHeight: "50px" }}
                variant={donationType === "recurring" ? "contained" : "outlined"}
                onClick={handleRecurringDonationClick}
              >
                {Locale.label("donation.donationForm.makeRecurring")}
              </Button>
            </Grid>
          </Grid>
          {donationType && (
            <div id="donation-details" style={{ marginTop: "20px" }}>
              <Grid container spacing={3}>
                {availableGateways.length > 1 && (
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Payment Provider</InputLabel>
                      <Select
                        id="gateway-select"
                        label="Payment Provider"
                        name="gateway"
                        aria-label="gateway"
                        value={selectedGateway}
                        onChange={handleChange}
                      >
                        {availableGateways.map((gw) => (
                          <MenuItem key={gw.provider} value={DonationHelper.normalizeProvider(gw.provider)}>
                            {DonationHelper.isProvider(gw.provider, "stripe") ? "Stripe" : "PayPal"}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                {selectedGateway !== "paypal" || availablePaymentMethods.length > 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>{Locale.label("donation.donationForm.method")}</InputLabel>
                      <Select
                        id="payment-method-select"
                        label={Locale.label("donation.donationForm.method")}
                        name="method"
                        aria-label="method"
                        value={donation.id}
                        className="capitalize"
                        onChange={handleChange}
                      >
                        {availablePaymentMethods.map((paymentMethod: PaymentMethod) => (
                          <MenuItem key={paymentMethod.id} value={paymentMethod.id}>
                            {paymentMethod.name} {paymentMethod.last4 ? `****${paymentMethod.last4}` : paymentMethod.email || ""}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                ) : (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Enter card details (PayPal Hosted Fields)</Typography>
                    <PayPalHostedFields
                      ref={hostedRef}
                      clientId={paypalClientId}
                      getClientToken={async () => {
                        try {
                          const resp = await ApiHelper.post(
                            "/donate/client-token",
                            {
                              churchId: props?.church?.id || "",
                              provider: "paypal",
                              gatewayId: selectedGatewayObj?.id || gateway?.id
                            },
                            "GivingApi"
                          );
                          const token = resp?.clientToken || resp?.token || resp?.result || resp;
                          return typeof token === "string" && token.length > 0 ? token : "";
                        } catch {
                          return "";
                        }
                      }}
                      createOrder={async () => {
                        try {
                          const fundsPayload = (donation?.funds || [])
                            .filter((f: any) => (f.amount || 0) > 0 && f.id)
                            .map((f: any) => ({ id: f.id, amount: f.amount || 0 }));
                          const response = await ApiHelper.post(
                            "/donate/create-order",
                            {
                              churchId: props?.church?.id || "",
                              provider: "paypal",
                              gatewayId: selectedGatewayObj?.id || gateway?.id,
                              amount: total,
                              currency: "USD",
                              funds: fundsPayload,
                              notes: donation?.notes || ""
                            },
                            "GivingApi"
                          );
                          return response?.id || response?.orderId || "";
                        } catch (_e) {
                          return "";
                        }
                      }}
                    />
                  </Grid>
                )}
              </Grid>
              {donationType === "recurring" && (
                <Grid container spacing={3} style={{ marginTop: 10 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      id="start-date-field"
                      fullWidth
                      name="date"
                      type="date"
                      aria-label="date"
                      label={Locale.label("donation.donationForm.startDate")}
                      value={DateHelper.formatHtml5Date(new Date(donation.billing_cycle_anchor || Date.now()))}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>{Locale.label("donation.donationForm.frequency")}</InputLabel>
                      <Select
                        id="frequency-select"
                        label={Locale.label("donation.donationForm.frequency")}
                        name="interval"
                        aria-label="interval"
                        value={interval}
                        onChange={handleChange}
                      >
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
                    <FundDonations fundDonations={fundDonations} funds={funds} updatedFunction={handleFundDonationsChange} />
                  </>
                )}
                {fundsTotal > 0 && (
                  <>
                    {(gateway?.payFees === true) ? (
                      <Typography fontSize={14} fontStyle="italic">
                        *{Locale.label("donation.donationForm.fees").replace("{}", CurrencyHelper.formatCurrency(transactionFee))}
                      </Typography>
                    ) : (
                      <FormGroup>
                        <FormControlLabel
                          control={<Checkbox />}
                          name="transaction-fee"
                          label={Locale.label("donation.donationForm.cover").replace("{}", CurrencyHelper.formatCurrency(transactionFee))}
                          onChange={handleCheckChange}
                        />
                      </FormGroup>
                    )}
                    <p>{Locale.label("donation.donationForm.total")}: ${total}</p>
                  </>
                )}
                <TextField
                  id="donation-notes"
                  fullWidth
                  label="Memo (optional)"
                  multiline
                  aria-label="note"
                  name="notes"
                  value={donation.notes || ""}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {errorMessage && <ErrorMessages errors={[errorMessage]}></ErrorMessages>}
            </div>
          )}
        </InputBox>
      </>
    );
  }
};
