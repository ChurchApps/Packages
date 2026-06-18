"use client";

import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { useStripe } from "@stripe/react-stripe-js";
import { InputBox, ErrorMessages } from "../..";
import { FundDonations } from ".";
import { DonationPreviewModal } from "../modals/DonationPreviewModal";
import { ApiHelper, CurrencyHelper, DateHelper } from "@churchapps/helpers";
import { Locale, DonationHelper } from "../helpers";
import type { PaymentMethod, PaymentGateway, MultiGatewayDonationInterface } from "../helpers";
import { getPaymentProvider } from "../providers";
import type { ChargeContext, MemberEntryHandle, PaymentToken } from "../providers";
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

const MultiGatewayDonationInner: React.FC<Props> = (props) => {
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

  const [selectedGateway] = useState<string>(
    DonationHelper.normalizeProvider(props?.paymentGateways?.find(g => g.enabled !== false)?.provider || "stripe")
  );
  const paymentProvider = useMemo(() => getPaymentProvider(selectedGateway), [selectedGateway]);
  const selectedGatewayObj = useMemo(() => {
    return (
      props.paymentGateways.find((g) => DonationHelper.normalizeProvider(g.provider) === selectedGateway) || null
    );
  }, [props.paymentGateways, selectedGateway]);
  const [donationType, setDonationType] = useState<string | undefined>("once");
  const [showDonationPreviewModal, setShowDonationPreviewModal] = useState<boolean>(false);
  const [interval, setInterval] = useState("one_month");
  const [gateway, setGateway] = useState<PaymentGateway | null>(selectedGatewayObj);
  const entryRef = useRef<MemberEntryHandle>(null);
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
  }, [donation, props.paymentMethods, fundsTotal, transactionFee, gateway?.id, selectedGatewayObj?.id]);

  const handleCancel = useCallback(() => { setDonationType(undefined); }, []);
  const handleDonationSelect = useCallback((type: string) => {
    const dt = donationType === type ? undefined : type;
    setDonationType(dt);
  }, [donationType]);

  const handleSingleDonationClick = useCallback(() => handleDonationSelect("once"), [handleDonationSelect]);
  const handleRecurringDonationClick = useCallback(() => handleDonationSelect("recurring"), [handleDonationSelect]);

  // Snapshot of the gift in flight, in the shape every provider adapter expects.
  const buildContext = useCallback((): ChargeContext => ({
    provider: selectedGateway,
    gatewayId: donation.gatewayId || gateway?.id || selectedGatewayObj?.id,
    churchId: props?.church?.id || "",
    amount: total,
    funds: (donation.funds || []).map((f: any) => ({ id: f.id, amount: f.amount })),
    person: {
      id: donation.person?.id || "",
      email: donation.person?.email || "",
      name: donation.person?.name || ""
    },
    notes: donation?.notes || "",
    church: {
      name: props?.church?.name || "",
      subDomain: props?.church?.subDomain || "",
      churchURL: typeof window !== "undefined" ? window.location.origin : "",
      logo: props?.churchLogo || ""
    },
    recurring: donationType === "recurring",
    interval: donation.interval,
    billingCycleAnchor: donation.billing_cycle_anchor,
    saveCard,
    customerId: props.customerId,
    currency: donation.currency
  }), [
    donation, total, donationType, saveCard, selectedGateway, gateway?.id, selectedGatewayObj?.id, props.church?.id, props.church?.name, props.church?.subDomain, props.churchLogo, props.customerId
  ]);

  const makeDonation = useCallback(async (message: string) => {
    const ctx = buildContext();

    // Capture a new payment if the provider needs one (no saved-card support, or
    // the user is entering a fresh card); otherwise charge the chosen saved method.
    const needsToken = !!paymentProvider.MemberEntry
      && (!paymentProvider.capabilities.savedCard || useNewCard || !donation.id || donation.id === "");

    let token: PaymentToken;
    if (needsToken) {
      try {
        token = await entryRef.current!.tokenize();
      } catch (e: any) {
        setShowDonationPreviewModal(false);
        setErrorMessage("Failed to process payment: " + (e.message || "Unknown error"));
        return;
      }
    } else {
      token = { id: donation.id, type: donation.type, saved: true };
    }

    const { endpoint, body } = paymentProvider.buildChargeRequest(ctx, token);
    let results = await ApiHelper.post(endpoint, body, "GivingApi");

    // Terminal: a freshly-tokenized payment must never silently retry on a falsy
    // response, or we'd double-charge.
    if (needsToken && !results) {
      setShowDonationPreviewModal(false);
      setErrorMessage(Locale.label("donation.kingdomFunding.unexpectedError"));
      return;
    }

    if (paymentProvider.finalizeResult) {
      const fin = await paymentProvider.finalizeResult(results, { stripe });
      if (fin.requiresAction) {
        setShowDonationPreviewModal(false);
        if (fin.success) {
          setDonationType(undefined);
          props.donationSuccess(message);
        } else {
          setErrorMessage(Locale.label("donation.common.error") + ": " + fin.error);
        }
        return;
      }
      results = fin.result;
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
  }, [buildContext, paymentProvider, donation.id, donation.type, useNewCard, stripe, props.donationSuccess]);

  const getTransactionFee = useCallback(async (amount: number, activeGatewayId?: string, provider: string = "stripe", paymentMethodType?: "card" | "bank" | "paypal") => {
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
      const fee = await getTransactionFee(totalAmount, d.gatewayId || gateway?.id || selectedGatewayObj?.id, d.provider || selectedGateway, d.type);
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

  // Show the provider's inline entry widget when there's no saved method to use:
  // PayPal (no vault) always; Kingdom Funding when adding a new card or none saved.
  const showInlineEntry = !!paymentProvider.MemberEntry
    && (!paymentProvider.capabilities.savedCard || useNewCard || availablePaymentMethods.length === 0);

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
    const MemberEntry = paymentProvider.MemberEntry;
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
                {!showInlineEntry ? (
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
                        {paymentProvider.capabilities.memberNewCard && (
                          <MenuItem value="__new__">
                            <Icon sx={{ mr: 1, fontSize: 18 }}>add_circle</Icon> Enter new card
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                ) : (
                  <Grid size={{ xs: 12 }}>
                    {selectedGatewayObj?.publicKey && MemberEntry ? (
                      <>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>{Locale.label("donation.kingdomFunding.enterCardDetails")}</Typography>
                        <MemberEntry ref={entryRef} gateway={selectedGatewayObj} getContext={buildContext} />
                        {/* Stripe saves the card implicitly (via /paymentmethods/addcard at
                            tokenize time), so a "save this card" toggle would be misleading. */}
                        {paymentProvider.capabilities.savedCard && props.person?.id && paymentProvider.key !== "stripe" && (
                          <FormGroup sx={{ mt: 1 }}>
                            <FormControlLabel
                              control={<Checkbox checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />}
                              label="Save this card for future donations"
                            />
                          </FormGroup>
                        )}

                        {paymentProvider.capabilities.savedCard && availablePaymentMethods.length > 0 && (
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

// Public member donation form. Applies the resolved provider's SDK wrapper
// (Stripe -> <Elements>, so 3DS works) around the provider-agnostic inner form.
export const MultiGatewayDonationForm: React.FC<Props> = (props) => {
  const provider = getPaymentProvider(props?.paymentGateways?.find(g => g.enabled !== false)?.provider || "stripe");
  const Wrapper = provider.MemberWrapper;
  const inner = <MultiGatewayDonationInner {...props} />;
  return Wrapper ? <Wrapper stripePromise={props.stripePromise}>{inner}</Wrapper> : inner;
};
