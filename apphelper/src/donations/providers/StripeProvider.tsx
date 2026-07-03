"use client";

import React, { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Box, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { ApiHelper } from "@churchapps/helpers";
import { NonAuthDonationInner } from "../components/NonAuthDonationInner";
import { DonationHelper } from "../helpers";
import { StripeInstanceContext } from "./StripeInstanceContext";
import type {
  PaymentProvider, GuestFormProps, ChargeContext, PaymentToken, ChargeRequest,
  MemberEntryHandle, MemberEntryProps
} from "./types";

const stripeSupportedCurrencies = [
  "usd", "eur", "gbp", "cad", "aud", "inr", "jpy", "sgd", "hkd", "sek", "nok", "dkk", "chf", "mxn", "brl"
];

const toggleSx = {
  backgroundColor: "#FFFFFF",
  color: "#333",
  "&.Mui-selected": { backgroundColor: "#1976d2", color: "#FFFFFF" },
  "&:hover": { backgroundColor: "#f5f5f5" },
  "&.Mui-selected:hover": { backgroundColor: "#1565c0" }
};

// Stripe guest form owns card/bank toggle + Elements wrapper; replaces inlined NonAuthDonation shell.
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

// Publish resolved Stripe instance to context so member form reads it without calling useStripe().
const StripeInstancePublisher: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stripe = useStripe();
  return <StripeInstanceContext.Provider value={stripe}>{children}</StripeInstanceContext.Provider>;
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
    signupUrl: () => "https://dashboard.stripe.com/"
  },
  capabilities: { savedCard: true, savedBank: true, guestAch: true, memberNewCard: false, recurring: true, editRecurring: true, pauseRecurring: true },

  MemberWrapper: ({ stripePromise, children }) => (
    <Elements stripe={stripePromise ?? null}>
      <StripeInstancePublisher>{children}</StripeInstancePublisher>
    </Elements>
  ),

  MemberEntry: StripeMemberEntry,

  buildChargeRequest: (ctx, token): ChargeRequest => ({
    endpoint: ctx.recurring ? "/donate/subscribe" : "/donate/charge",
    body: buildSavedMethodBody(ctx, token, "stripe")
  }),

  finalizeResult: async (result, { stripe }) => {
    const tds = await DonationHelper.handle3DSIfRequired(result, stripe ?? null);
    if (!tds.requiresAction) return { result };
    return { result, requiresAction: true, success: tds.success, error: tds.error };
  },

  GuestForm: StripeGuestForm
};

export { buildSavedMethodBody };
