"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Box, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { ApiHelper } from "@churchapps/helpers";
import { NonAuthDonationInner } from "./NonAuthDonationInner";
import { CardForm } from "./CardForm";
import { BankForm } from "./BankForm";
import { FormCardPayment } from "./FormCardPayment";
import { handle3DSIfRequired } from "./stripe3DS";
import { StripeInstanceContext, setCurrentStripe, getCurrentStripe } from "./StripeInstanceContext";
import type {
  PaymentProvider, GuestFormProps, ChargeContext, PaymentToken, ChargeRequest,
  MemberEntryHandle, MemberEntryProps, MethodEditFormProps
} from "../types";
import type { PaymentGateway } from "../../helpers";

const stripeSupportedCurrencies = [
  "usd", "eur", "gbp", "cad", "aud", "inr", "jpy", "sgd", "hkd", "sek", "nok", "dkk", "chf", "mxn", "brl"
];

// Default card rates per currency; the admin fee-settings form seeds from these.
const stripeDefaultFees: Record<string, { percent: number; fixed: number; symbol: string }> = {
  usd: { percent: 2.9, fixed: 0.3, symbol: "$" },
  eur: { percent: 2.9, fixed: 0.25, symbol: "€" },
  gbp: { percent: 2.9, fixed: 0.2, symbol: "£" },
  cad: { percent: 2.9, fixed: 0.3, symbol: "C$" },
  aud: { percent: 2.9, fixed: 0.3, symbol: "A$" },
  inr: { percent: 2.9, fixed: 3.0, symbol: "₹" },
  jpy: { percent: 2.9, fixed: 30.0, symbol: "¥" },
  sgd: { percent: 2.9, fixed: 0.5, symbol: "S$" },
  hkd: { percent: 2.9, fixed: 2.35, symbol: "元" },
  sek: { percent: 2.9, fixed: 2.5, symbol: "SEK" },
  nok: { percent: 2.9, fixed: 2.0, symbol: "NOK" },
  dkk: { percent: 2.9, fixed: 1.8, symbol: "DKK" },
  chf: { percent: 2.9, fixed: 0.3, symbol: "CHF" },
  mxn: { percent: 2.9, fixed: 3.0, symbol: "MXN" },
  brl: { percent: 3.9, fixed: 0.5, symbol: "R$" }
};

const toggleSx = {
  backgroundColor: "#FFFFFF",
  color: "#333",
  "&.Mui-selected": { backgroundColor: "#1976d2", color: "#FFFFFF" },
  "&:hover": { backgroundColor: "#f5f5f5" },
  "&.Mui-selected:hover": { backgroundColor: "#1565c0" }
};

// Stripe guest form owns card/bank toggle + Elements wrapper.
const StripeGuestForm: React.FC<GuestFormProps> = (props) => {
  const [paymentType, setPaymentType] = useState<"card" | "bank">("card");
  const stripePromise = useMemo(
    () => (props.gateway?.publicKey ? loadStripe(props.gateway.publicKey) : null),
    [props.gateway?.publicKey]
  );
  const currency = props.gateway?.currency || "usd";

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={paymentType}
          exclusive
          onChange={(_, value) => value && setPaymentType(value)}
          fullWidth
          size="small"
          sx={{ backgroundColor: "#FFFFFF", borderRadius: 1 }}
        >
          <ToggleButton value="card" sx={toggleSx}>Credit/Debit Card</ToggleButton>
          {currency === "usd" && <ToggleButton value="bank" sx={toggleSx}>Bank Account (ACH)</ToggleButton>}
        </ToggleButtonGroup>
      </Box>
      <Elements stripe={stripePromise}>
        <NonAuthDonationInner
          churchId={props.churchId}
          mainContainerCssProps={props.mainContainerCssProps}
          showHeader={false}
          recaptchaSiteKey={props.recaptchaSiteKey}
          churchLogo={props?.churchLogo}
          paymentType={paymentType}
          allowSingleGift={props.allowSingleGift}
          allowRecurring={props.allowRecurring}
          showFundSelector={props.showFundSelector}
          allowedFundIds={props.allowedFundIds}
          defaultFundId={props.defaultFundId}
        />
      </Elements>
    </Box>
  );
};

// Mirrors guest path: tokenize card, save via /paymentmethods/addcard (creates customer), charge saved method.
const StripeMemberEntry = forwardRef<MemberEntryHandle, MemberEntryProps>(({ gateway, getContext }, ref) => {
  const stripe = useStripe();
  const elements = useElements();
  useImperativeHandle(ref, () => ({
    tokenize: async (): Promise<PaymentToken> => {
      const cardData = elements?.getElement(CardElement);
      if (!stripe || !cardData) throw new Error("Card form not ready. Please wait and try again.");
      const stripePM = await stripe.createPaymentMethod({ type: "card", card: cardData });
      if (stripePM.error) throw new Error(stripePM.error.message || "Card creation failed");

      const ctx = getContext?.();
      const result = await ApiHelper.post("/paymentmethods/addcard", {
        id: stripePM.paymentMethod!.id,
        personId: ctx?.person?.id,
        email: ctx?.person?.email,
        name: ctx?.person?.name,
        churchId: ctx?.churchId,
        provider: "stripe",
        gatewayId: gateway?.id
      }, "GivingApi");
      if (result?.raw?.message) throw new Error(result.raw.message);

      const pm = result?.paymentMethod;
      return { id: pm?.id, type: "card", saved: true, customerId: result?.customerId, last4: pm?.last4, brand: pm?.name };
    }
  }));
  return <CardElement options={{ style: { base: { fontSize: "18px" } } }} />;
});
StripeMemberEntry.displayName = "StripeMemberEntry";

// Publish resolved Stripe instance so components and finalizeResult can reach it without useStripe().
const StripeInstancePublisher: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stripe = useStripe();
  useEffect(() => {
    setCurrentStripe(stripe);
    return () => setCurrentStripe(null);
  }, [stripe]);
  return <StripeInstanceContext.Provider value={stripe}>{children}</StripeInstanceContext.Provider>;
};

// Loads Stripe from the gateway's public key and wraps children in <Elements> (needed for entry + 3DS).
const StripeMemberWrapper: React.FC<{ gateway?: PaymentGateway | null; children: React.ReactNode }> = ({ gateway, children }) => {
  const stripePromise = useMemo(
    () => (gateway?.publicKey ? loadStripe(gateway.publicKey) : null),
    [gateway?.publicKey]
  );
  return (
    <Elements stripe={stripePromise}>
      <StripeInstancePublisher>{children}</StripeInstancePublisher>
    </Elements>
  );
};

// Card/bank edit forms bring their own Elements context (rendered outside the member donation form).
const StripeMethodEditForm: React.FC<MethodEditFormProps> = (props) => {
  const stripePromise = useMemo(
    () => (props.gateway?.publicKey ? loadStripe(props.gateway.publicKey) : null),
    [props.gateway?.publicKey]
  );
  const setMode = (mode: string) => { if (mode === "display") props.onCancel(); };
  return (
    <Elements stripe={stripePromise}>
      {props.method?.type === "bank" ? (
        <BankForm
          bank={props.method}
          showVerifyForm={props.verify || false}
          customerId={props.customerId}
          person={props.person}
          setMode={setMode}
          deletePayment={props.onDelete}
          updateList={props.onUpdated}
          gateway={props.gateway}
        />
      ) : (
        <CardForm
          card={props.method}
          customerId={props.customerId}
          person={props.person}
          setMode={setMode}
          deletePayment={props.onDelete}
          updateList={props.onUpdated}
          gateway={props.gateway}
        />
      )}
    </Elements>
  );
};

// Charge saved method (existing or fresh card); token carries new customerId for first-time donors.
function buildSavedMethodBody(ctx: ChargeContext, token: PaymentToken, providerKey: string) {
  return {
    id: token.id,
    type: token.type,
    provider: providerKey,
    customerId: token.customerId || ctx.customerId,
    gatewayId: ctx.gatewayId,
    person: ctx.person,
    amount: ctx.amount,
    funds: ctx.funds,
    billing_cycle_anchor: ctx.billingCycleAnchor,
    interval: ctx.interval,
    notes: ctx.notes,
    currency: ctx.currency,
    church: ctx.church
  };
}

export const StripeProvider: PaymentProvider = {
  key: "stripe",
  descriptor: {
    adminValue: "Stripe",
    label: "Stripe",
    keyLabels: { public: "settings.givingSettingsEdit.pubKey", private: "settings.givingSettingsEdit.secKey" },
    feeFields: ["card", "ach"],
    currencies: stripeSupportedCurrencies,
    selectableInAdmin: true,
    setupInstructionsKey: "settings.givingSettingsEdit.stripeSetup",
    signupUrl: () => "https://dashboard.stripe.com/",
    currencyHelpUrl: "https://dashboard.stripe.com/settings/currencies",
    eventUrl: (eventId) => "https://dashboard.stripe.com/events/" + eventId,
    defaultFees: stripeDefaultFees
  },
  capabilities: { savedCard: true, savedBank: true, guestAch: true, memberNewCard: false, recurring: true, editRecurring: true, pauseRecurring: true, implicitSaveOnTokenize: true },

  MemberWrapper: StripeMemberWrapper,

  MemberEntry: StripeMemberEntry,

  buildChargeRequest: (ctx, token): ChargeRequest => ({
    endpoint: ctx.recurring ? "/donate/subscribe" : "/donate/charge",
    body: buildSavedMethodBody(ctx, token, "stripe")
  }),

  finalizeResult: async (result) => {
    const tds = await handle3DSIfRequired(result, getCurrentStripe());
    if (!tds.requiresAction) return { result };
    return { result, requiresAction: true, success: tds.success, error: tds.error };
  },

  GuestForm: StripeGuestForm,
  MethodEditForm: StripeMethodEditForm,
  FormPayment: FormCardPayment
};

export { buildSavedMethodBody };
