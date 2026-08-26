"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import { Alert, Typography } from "@mui/material";
import { Locale } from "../../helpers";
import { openPaystackPopup } from "./paystackPopup";
import { PaystackNonAuthDonationInner } from "./PaystackNonAuthDonationInner";
import type {
  PaymentProvider, GuestFormProps, PaymentToken, ChargeRequest,
  ChargeContext, MemberEntryHandle, MemberEntryProps
} from "../types";

// Paystack charges inside its popup; tokenize() returns the paid transaction reference.
// Without a gift context (e.g. the "add card" dialog) there is no amount to charge, so it declines.
const PaystackMemberEntry = forwardRef<MemberEntryHandle, MemberEntryProps>(({ gateway, getContext }, ref) => {
  useImperativeHandle(ref, () => ({
    tokenize: async (): Promise<PaymentToken> => {
      const ctx = getContext?.();
      if (!ctx || !ctx.amount) throw new Error(Locale.label("donation.paystack.saveOnlyWithGift"));
      if (!ctx.person?.email) throw new Error(Locale.label("donation.paystack.emailRequired"));
      const result = await openPaystackPopup({
        key: gateway.publicKey || "",
        email: ctx.person.email,
        amount: ctx.amount,
        currency: ctx.currency || gateway.currency || "NGN",
        metadata: { personId: ctx.person.id, funds: ctx.funds, churchId: ctx.churchId }
      });
      if (!result.reference) throw new Error(Locale.label("donation.paystack.paymentFailed"));
      return { id: result.reference, type: "card" };
    }
  }));
  return getContext
    ? <Typography variant="body2" color="text.secondary" data-testid="paystack-entry">{Locale.label("donation.paystack.popupHint")}</Typography>
    : <Alert severity="info">{Locale.label("donation.paystack.saveOnlyWithGift")}</Alert>;
});
PaystackMemberEntry.displayName = "PaystackMemberEntry";

const PaystackGuestForm: React.FC<GuestFormProps> = (props) => (
  <PaystackNonAuthDonationInner
    churchId={props.churchId}
    mainContainerCssProps={props.mainContainerCssProps}
    showHeader={false}
    recaptchaSiteKey={props.recaptchaSiteKey}
    churchLogo={props?.churchLogo}
    allowRecurring={props.allowRecurring}
    showFundSelector={props.showFundSelector}
    allowedFundIds={props.allowedFundIds}
    defaultFundId={props.defaultFundId}
  />
);

export const paystackDefaultFees: Record<string, { percent: number; fixed: number; symbol: string }> = {
  ngn: { percent: 1.5, fixed: 100, symbol: "₦" },
  ghs: { percent: 1.95, fixed: 0, symbol: "GH₵" },
  zar: { percent: 2.9, fixed: 1, symbol: "R" },
  kes: { percent: 2.9, fixed: 0, symbol: "KSh" },
  xof: { percent: 3.2, fixed: 0, symbol: "CFA" },
  usd: { percent: 3.9, fixed: 0, symbol: "$" }
};

export function buildPaystackBody(ctx: ChargeContext, token: PaymentToken): any {
  const body: any = {
    provider: "paystack",
    gatewayId: ctx.gatewayId,
    churchId: ctx.churchId,
    amount: ctx.amount,
    currency: ctx.currency,
    funds: ctx.funds,
    person: ctx.person,
    notes: ctx.notes || "",
    church: ctx.church,
    saveCard: ctx.saveCard,
    type: token.type,
    id: token.id,
    customerId: token.customerId || ctx.customerId
  };
  if (ctx.recurring) {
    body.billing_cycle_anchor = ctx.billingCycleAnchor;
    body.interval = ctx.interval;
  }
  return body;
}

export const PaystackProvider: PaymentProvider = {
  key: "paystack",
  descriptor: {
    adminValue: "Paystack",
    label: "Paystack",
    keyLabels: { public: "settings.givingSettingsEdit.pubKey", private: "settings.givingSettingsEdit.secKey" },
    feeFields: ["card"],
    currencies: ["ngn", "ghs", "zar", "kes", "xof", "usd"],
    selectableInAdmin: true,
    setupInstructionsKey: "settings.givingSettingsEdit.paystackSetup",
    webhookInstructionsKey: "settings.givingSettingsEdit.paystackWebhookInstructions",
    signupUrl: () => "https://dashboard.paystack.com/",
    currencyHelpUrl: "https://support.paystack.com/en/articles/2130690",
    defaultFees: paystackDefaultFees
  },
  capabilities: { savedCard: true, savedBank: false, guestAch: false, memberNewCard: true, recurring: true, editRecurring: false, pauseRecurring: false },

  MemberEntry: PaystackMemberEntry,

  buildChargeRequest: (ctx, token): ChargeRequest => ({
    endpoint: ctx.recurring ? "/donate/subscribe" : "/donate/charge",
    body: buildPaystackBody(ctx, token)
  }),

  GuestForm: PaystackGuestForm
};
