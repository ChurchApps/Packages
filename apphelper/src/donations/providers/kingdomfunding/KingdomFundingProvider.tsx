"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Button, Grid } from "@mui/material";
import { KingdomFundingTokenForm, KingdomFundingTokenFormHandle } from "./KingdomFundingTokenForm";
import { KingdomFundingNonAuthDonationInner } from "./KingdomFundingNonAuthDonationInner";
import { Locale } from "../../helpers";
import type {
  PaymentProvider, GuestFormProps, PaymentToken, ChargeRequest,
  ChargeContext, MemberEntryHandle, MemberEntryProps
} from "../types";

const KingdomFundingMemberEntry = forwardRef<MemberEntryHandle, MemberEntryProps>(({ gateway }, ref) => {
  const kfRef = useRef<KingdomFundingTokenFormHandle>(null);
  const [payMethod, setPayMethod] = useState<"card" | "ach">("card");

  useImperativeHandle(ref, () => ({
    tokenize: async (): Promise<PaymentToken> => {
      if (!kfRef.current) throw new Error("Card form not ready. Please wait and try again.");
      const r = await kfRef.current.getNonce();
      const type: "card" | "bank" = r.paymentType === "ach" ? "bank" : "card";
      return {
        id: r.nonce,
        type,
        brand: r.cardType || undefined,
        last4: r.last4 || r.accountLast4 || undefined,
        expMonth: r.expiryMonth || undefined,
        expYear: r.expiryYear || undefined
      };
    }
  }));

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 6 }}>
          <Button
            aria-label="kf-pay-card"
            fullWidth
            variant={payMethod === "card" ? "contained" : "outlined"}
            onClick={() => setPayMethod("card")}
          >
            {Locale.label("donation.kingdomFunding.payWithCard")}
          </Button>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Button
            aria-label="kf-pay-bank"
            fullWidth
            variant={payMethod === "ach" ? "contained" : "outlined"}
            onClick={() => setPayMethod("ach")}
          >
            {Locale.label("donation.kingdomFunding.payWithBank")}
          </Button>
        </Grid>
      </Grid>
      <KingdomFundingTokenForm
        ref={kfRef}
        tokenizationKey={gateway.publicKey || ""}
        paymentMethod={payMethod}
        sandbox={gateway?.settings?.sandbox === true || gateway?.environment === "sandbox"}
      />
    </>
  );
});
KingdomFundingMemberEntry.displayName = "KingdomFundingMemberEntry";

const KingdomFundingGuestForm: React.FC<GuestFormProps> = (props) => (
  <KingdomFundingNonAuthDonationInner
    churchId={props.churchId}
    mainContainerCssProps={props.mainContainerCssProps}
    showHeader={false}
    recaptchaSiteKey={props.recaptchaSiteKey}
    churchLogo={props?.churchLogo}
  />
);

function buildKfSavedBody(ctx: ChargeContext, token: PaymentToken, providerKey: string) {
  return {
    paymentMethodId: token.id,
    customerId: token.customerId || ctx.customerId,
    type: token.type,
    provider: providerKey,
    gatewayId: ctx.gatewayId,
    person: ctx.person,
    amount: ctx.amount,
    funds: ctx.funds,
    billing_cycle_anchor: ctx.billingCycleAnchor,
    interval: ctx.interval,
    notes: ctx.notes,
    church: ctx.church
  };
}

export const KingdomFundingProvider: PaymentProvider = {
  key: "kingdomfunding",
  descriptor: {
    adminValue: "KingdomFunding",
    label: "Kingdom Funding",
    keyLabels: {
      public: "settings.givingSettingsEdit.tokenizationKey",
      private: "settings.givingSettingsEdit.sourceKey",
      webhook: "settings.givingSettingsEdit.webhookKey"
    },
    feeFields: ["kf"],
    currencies: [],
    selectableInAdmin: true,
    betaOnly: true,
    setupInstructionsKey: "settings.givingSettingsEdit.kfSetup",
    signupUrl: (church, user) => {
      const fullName = ((user?.firstName || "") + " " + (user?.lastName || "")).trim();
      const params: [string, string][] = [
        ["sponsor", "b1"],
        ["email", user?.email],
        ["org", church?.name],
        ["full_name", fullName],
        ["phone", user?.contactInfo?.workPhone],
        ["address1", church?.address1],
        ["address2", church?.address2],
        ["state", church?.state],
        ["zip", church?.zip],
        ["country", church?.country]
      ];
      return "https://kingdomfunding.org/begin-registration/?" + params.map(([k, v]) => k + "=" + encodeURIComponent(v || "")).join("&");
    }
  },
  capabilities: { savedCard: true, savedBank: true, guestAch: true, memberNewCard: true, recurring: true, editRecurring: false, pauseRecurring: false },

  MemberEntry: KingdomFundingMemberEntry,

  buildChargeRequest: (ctx, token): ChargeRequest => {
    const endpoint = ctx.recurring ? "/donate/subscribe" : "/donate/charge";
    if (token.saved) return { endpoint, body: buildKfSavedBody(ctx, token, "kingdomfunding") };
    const body: any = {
      provider: "kingdomfunding",
      gatewayId: ctx.gatewayId,
      churchId: ctx.churchId,
      amount: ctx.amount,
      funds: ctx.funds,
      person: ctx.person,
      notes: ctx.notes || "",
      church: ctx.church,
      saveCard: ctx.saveCard,
      type: token.type,
      id: token.id,
      cardBrand: token.brand,
      cardLast4: token.last4,
      expiry_month: token.expMonth,
      expiry_year: token.expYear
    };
    if (ctx.recurring) {
      body.billing_cycle_anchor = ctx.billingCycleAnchor;
      body.interval = ctx.interval;
    }
    return { endpoint, body };
  },

  GuestForm: KingdomFundingGuestForm
};
