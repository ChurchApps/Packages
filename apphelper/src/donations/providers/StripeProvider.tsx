"use client";

import React, { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Box, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { NonAuthDonationInner } from "../components/NonAuthDonationInner";
import { DonationHelper } from "../helpers";
import type { PaymentProvider, GuestFormProps, ChargeContext, PaymentToken, ChargeRequest } from "./types";

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

// Stripe guest form: owns its own card/bank (ACH) toggle and Elements wrapper,
// then renders the existing Stripe inner form. This is what the NonAuthDonation
// shell used to inline for `=== "stripe"`.
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

// Member Stripe donations charge a saved payment method (cards are added in
// PaymentMethods, not inline) — so the body is the saved-method shape.
function buildSavedMethodBody(ctx: ChargeContext, token: PaymentToken, providerKey: string) {
  return {
    id: token.id,
    type: token.type,
    provider: providerKey,
    customerId: ctx.customerId,
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
  capabilities: { savedCard: true, savedBank: true, guestAch: true, memberNewCard: false, recurring: true, editRecurring: true },

  MemberWrapper: ({ stripePromise, children }) => <Elements stripe={stripePromise ?? null}>{children}</Elements>,

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
