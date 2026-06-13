"use client";

import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { useStripe } from "@stripe/react-stripe-js";
import { InputBox, ErrorMessages } from "../..";
import { FundDonations } from ".";
import { PayPalHostedFields, PayPalHostedFieldsHandle } from "./PayPalHostedFields";
import { KingdomFundingTokenForm, KingdomFundingTokenFormHandle } from "./KingdomFundingTokenForm";
import { DonationPreviewModal } from "../modals/DonationPreviewModal";
import { ApiHelper, CurrencyHelper, DateHelper } from "@churchapps/helpers";
import { Locale, DonationHelper } from "../helpers";
import type { PaymentMethod, PaymentGateway, MultiGatewayDonationInterface } from "../helpers";
import { PersonInterface, FundDonationInterface, FundInterface, ChurchInterface } from "@churchapps/helpers";
import {
  Grid,
  Icon,
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

// Note: Kingdom Funding ACH support is intentionally omitted from this form
// pending hosted ACH tokenization support from the gateway. KF flows here are
// card-only (matches the `KF_ACH_ENABLED = false` gate in sibling components).

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
  const [saveCard, setSaveCard] = useState<boolean>(false);
  const [useNewCard, setUseNewCard] = useState<boolean>(false);
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
  const kfTokenRef = useRef<KingdomFundingTokenFormHandle>(null);
  const feeTimeoutRef = useRef<number | null>(null);
  const [donation, setDonation] = useState<MultiGatewayDonationInterface>({
    id: props?.paymentMethods?.length > 0 ? props.paymentMethods[0].id : "",
    type: props?.paymentMethods?.length > 0 ? (props.paymentMethods[0].type as "card" | "bank" | "paypal") : "card",
    provider: props?.paymentMethods?.length > 0
      ? DonationHelper.normalizeProvider(props.paymentMethods[0].provider) as "stripe" | "paypal" | "kingdomfunding"
      : (selectedGateway as "stripe" | "paypal" | "kingdomfunding"),
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
    gatewayId: props?.paymentMethods?.length > 0 ? props.paymentMethods[0].gatewayId : selectedGatewayObj?.id,
    currency: selectedGatewayObj?.currency || "usd"
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
      case "gateway": {
        setSelectedGateway(value);
        setUseNewCard(false);
        d.provider = value as "stripe" | "paypal" | "kingdomfunding";
        const matchedGateway = props.paymentGateways.find(g => DonationHelper.normalizeProvider(g.provider) === value);
        d.gatewayId = matchedGateway?.id;
        d.currency = matchedGateway?.currency || "usd";
        // Reset payment method when changing gateways
        const availableMethods = props.paymentMethods.filter(pm => DonationHelper.normalizeProvider(pm.provider) === value);
        if (availableMethods.length > 0) {
          d.id = availableMethods[0].id;
          d.type = availableMethods[0].type as "card" | "bank" | "paypal";
          setPaymentMethodName(`${availableMethods[0].name} ${availableMethods[0].last4 ? `****${availableMethods[0].last4}` : availableMethods[0].email || ""}`);
        } else {
          d.id = "";
          if (value === "paypal") d.type = "paypal";
          else d.type = "card";
        }
        break;
      }
      case "method": {
        d.id = value;
        const pm = props.paymentMethods.find(pm => pm.id === value);
        if (pm) {
          d.type = pm.type as "card" | "bank" | "paypal";
          d.provider = DonationHelper.normalizeProvider(pm.provider) as "stripe" | "paypal" | "kingdomfunding";
          d.gatewayId = pm.gatewayId || gateway?.id || selectedGatewayObj?.id;
          setPaymentMethodName(`${pm.name} ${pm.last4 ? `****${pm.last4}` : pm.email || ""}`);
        }
        break;
      }
      case "type": setDonationType(value); break;
      case "date": d.billing_cycle_anchor = value ? + new Date(value) : + new Date(); break;
      case "interval":
        setInterval(value);
        d.interval = DonationHelper.getInterval(value);
        break;
      case "notes": d.notes = value; break;
      case "transaction-fee": {
        const element = e.target as HTMLInputElement;
        d.amount = element.checked ? fundsTotal + transactionFee : fundsTotal;
        const showFee = element.checked ? transactionFee : 0;
        setTotal(d.amount);
        setPayFee(showFee);
      }
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

    const compactFunds = (donation.funds || []).map((f: any) => ({ id: f.id, amount: f.amount }));

    // KingdomFunding without saved method (or user chose "new card") — tokenize card via iframe
    if (selectedGateway === "kingdomfunding" && (useNewCard || !donation.id || donation.id === "")) {
      try {
        if (!kfTokenRef.current) {
          setShowDonationPreviewModal(false);
          setErrorMessage("Card form not ready. Please wait and try again.");
          return;
        }
        const tokenResult = await kfTokenRef.current.getNonce();
        const payload: any = {
          provider: "kingdomfunding",
          gatewayId: selectedGatewayObj?.id || gateway?.id,
          churchId: props?.church?.id || "",
          amount: total,
          funds: compactFunds,
          person: donation.person,
          notes: donation?.notes || "",
          church: churchObj,
          saveCard,
          type: "card",
          id: tokenResult.nonce,
          cardBrand: tokenResult.cardType,
          cardLast4: tokenResult.last4,
          expiry_month: tokenResult.expiryMonth,
          expiry_year: tokenResult.expiryYear
        };

        if (donationType === "recurring") {
          payload.billing_cycle_anchor = donation.billing_cycle_anchor;
          payload.interval = donation.interval;
        }

        if (donationType === "once") results = await ApiHelper.post("/donate/charge", payload, "GivingApi");
        if (donationType === "recurring") results = await ApiHelper.post("/donate/subscribe", payload, "GivingApi");
        // Terminal: never fall through to the generic POST below, or a falsy
        // response body would trigger a second charge.
        if (!results) {
          setShowDonationPreviewModal(false);
          setErrorMessage(Locale.label("donation.kingdomFunding.unexpectedError"));
          return;
        }
      } catch (e: any) {
        setShowDonationPreviewModal(false);
        setErrorMessage("Failed to process payment: " + (e.message || "Unknown error"));
        return;
      }
    }

    // If using PayPal without a saved method, try Hosted Fields
    if (!results && selectedGateway === "paypal" && (!donation.id || donation.id === "") && paypalClientId) {
      try {
        const payload = await hostedRef.current?.submit();
        const orderId = (payload as any)?.orderId || (payload as any)?.id || "";
        if (orderId) {
          // Capture and persist via unified /donate/charge endpoint for PayPal
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
        provider: donation.provider || (selectedGateway as "stripe" | "paypal" | "kingdomfunding"),
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

    if (results?.status === "succeeded" || results?.status === "pending" || results?.status === "active" || results?.status === "processing" || results?.status === "CREATED" || results?.status === "Approved") {
      setShowDonationPreviewModal(false);
      setDonationType(undefined);
      props.donationSuccess(message);
    }
    if (results?.raw?.message || results?.message) {
      setShowDonationPreviewModal(false);
      setErrorMessage(Locale.label("donation.common.error") + ": " + (results?.raw?.message || results?.message));
    }
  }, [
    donation, donationType, gateway?.id, paypalClientId, props.church?.name, props.church?.subDomain, props.church?.id, props.churchLogo, props.donationSuccess, selectedGateway, selectedGatewayObj?.id, total, stripe, useNewCard, saveCard
  ]);

  const getTransactionFee = useCallback(async (amount: number, activeGatewayId?: string, provider: "stripe" | "paypal" = "stripe", paymentMethodType?: "card" | "bank" | "paypal") => {
    if (amount > 0) {
      try {
        const payload: any = { amount, provider, gatewayId: activeGatewayId, currency: gateway?.currency || "USD" };
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
      const fee = await getTransactionFee(totalAmount, d.gatewayId || gateway?.id || selectedGatewayObj?.id, (d.provider as "stripe" | "paypal") || (selectedGateway as "stripe" | "paypal"), d.type);
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
      return { ...prev, provider: nextProvider, gatewayId: nextGatewayId, currency: selectedGatewayObj?.currency || "usd" };
    });
  }, [selectedGateway, selectedGatewayObj?.id, selectedGatewayObj?.currency]);

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

  const getGatewayLabel = (provider: string) => {
    const normalized = DonationHelper.normalizeProvider(provider);
    if (normalized === "kingdomfunding") return Locale.label("donation.kingdomFunding.providerName");
    if (normalized === "paypal") return "PayPal";
    return "Stripe";
  };

  // Determine if we need to show a hosted payment form (no saved methods or user chose "new card")
  const needsHostedForm = (selectedGateway === "paypal" || selectedGateway === "kingdomfunding") && (availablePaymentMethods.length === 0 || useNewCard);

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
                      <InputLabel>{Locale.label("donation.kingdomFunding.paymentProvider")}</InputLabel>
                      <Select
                        id="gateway-select"
                        label={Locale.label("donation.kingdomFunding.paymentProvider")}
                        name="gateway"
                        aria-label="gateway"
                        value={selectedGateway}
                        onChange={handleChange}
                      >
                        {availableGateways.map((gw) => (
                          <MenuItem key={gw.provider} value={DonationHelper.normalizeProvider(gw.provider)}>
                            {getGatewayLabel(gw.provider)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                {!needsHostedForm ? (
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
                        onChange={(e) => {
                          if (e.target.value === "__new__") {
                            setUseNewCard(true);
                            setPaymentMethodName("New card");
                            const d = { ...donation };
                            d.id = "";
                            setDonation(d);
                          } else {
                            // Switching back to a saved card after picking "Enter new card"
                            // must clear useNewCard, otherwise the submit handler still
                            // tries to tokenize a card the iframe never collected.
                            setUseNewCard(false);
                            handleChange(e);
                          }
                        }}
                      >
                        {availablePaymentMethods.map((paymentMethod: PaymentMethod) => (
                          <MenuItem key={paymentMethod.id} value={paymentMethod.id}>
                            {paymentMethod.name} {paymentMethod.last4 ? `****${paymentMethod.last4}` : paymentMethod.email || ""}
                          </MenuItem>
                        ))}
                        {selectedGateway === "kingdomfunding" && (
                          <MenuItem value="__new__">
                            <Icon sx={{ mr: 1, fontSize: 18 }}>add_circle</Icon> Enter new card
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                ) : selectedGateway === "kingdomfunding" ? (
                  <Grid size={{ xs: 12 }}>
                    {selectedGatewayObj?.publicKey ? (
                      <>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>{Locale.label("donation.kingdomFunding.enterCardDetails")}</Typography>
                        <KingdomFundingTokenForm
                          ref={kfTokenRef}
                          tokenizationKey={selectedGatewayObj.publicKey}
                          sandbox={selectedGatewayObj?.settings?.sandbox === true || selectedGatewayObj?.environment === "sandbox"}
                        />
                        {props.person?.id && (
                          <FormGroup sx={{ mt: 1 }}>
                            <FormControlLabel
                              control={<Checkbox checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />}
                              label="Save this card for future donations"
                            />
                          </FormGroup>
                        )}

                        {availablePaymentMethods.length > 0 && (
                          <Button size="small" sx={{ mt: 1 }} onClick={() => {
                            setUseNewCard(false);
                            const d = { ...donation };
                            d.id = availablePaymentMethods[0].id;
                            d.type = availablePaymentMethods[0].type as "card" | "bank" | "paypal";
                            setDonation(d);
                            setPaymentMethodName(`${availablePaymentMethods[0].name} ${availablePaymentMethods[0].last4 ? `****${availablePaymentMethods[0].last4}` : ""}`);
                          }}>
                            Use a saved payment method instead
                          </Button>
                        )}
                      </>
                    ) : (
                      <Alert severity="warning">{Locale.label("donation.kingdomFunding.gatewayConfigMissing")}</Alert>
                    )}
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
                              currency: (selectedGatewayObj?.currency || gateway?.currency || "USD").toUpperCase(),
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
                    <FundDonations fundDonations={fundDonations} funds={funds} updatedFunction={handleFundDonationsChange} currency={gateway?.currency} />
                  </>
                )}
                {fundsTotal > 0 && (
                  <>
                    {(gateway?.payFees === true) ? (
                      <Typography fontSize={14} fontStyle="italic">
                        *{Locale.label("donation.donationForm.fees").replace("{}", CurrencyHelper.formatCurrencyWithLocale(transactionFee, gateway?.currency || "USD"))}
                      </Typography>
                    ) : (
                      <FormGroup>
                        <FormControlLabel
                          control={<Checkbox />}
                          name="transaction-fee"
                          label={Locale.label("donation.donationForm.cover").replace("{}", CurrencyHelper.formatCurrencyWithLocale(transactionFee, gateway?.currency || "USD"))}
                          onChange={handleCheckChange}
                        />
                      </FormGroup>
                    )}
                    <p>{Locale.label("donation.donationForm.total")}: {CurrencyHelper.formatCurrencyWithLocale(total, gateway?.currency || "USD")}</p>
                  </>
                )}
                <TextField
                  id="donation-notes"
                  fullWidth
                  label={Locale.label("donation.kingdomFunding.memo")}
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
