"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { KingdomFundingTokenForm, KingdomFundingTokenFormHandle } from "../components/KingdomFundingTokenForm";
import { KingdomFundingNonAuthDonationInner } from "../components/KingdomFundingNonAuthDonationInner";
import { buildSavedMethodBody } from "./StripeProvider";
import type {
  PaymentProvider, GuestFormProps, PaymentToken, ChargeRequest,
  MemberEntryHandle, MemberEntryProps
} from "./types";

// Inline card entry for member donations — wraps the accept.blue hosted iframe
// and normalizes its nonce into the uniform PaymentToken.
const KingdomFundingMemberEntry = forwardRef<MemberEntryHandle, MemberEntryProps>(({ gateway }, ref) => {
  const kfRef = useRef<KingdomFundingTokenFormHandle>(null);
  useImperativeHandle(ref, () => ({
    tokenize: async (): Promise<PaymentToken> => {
      if (!kfRef.current) throw new Error("Card form not ready. Please wait and try again.");
      const r = await kfRef.current.getNonce();
      return { id: r.nonce, type: "card", brand: r.cardType, last4: r.last4, expMonth: r.expiryMonth, expYear: r.expiryYear };
    }
  }));
  return (
    <KingdomFundingTokenForm
      ref={kfRef}
      tokenizationKey={gateway.publicKey || ""}
      sandbox={gateway?.settings?.sandbox === true || gateway?.environment === "sandbox"}
    />
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
    paymentType="card"
  />
);

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
  capabilities: { savedCard: true, savedBank: false, guestAch: false, memberNewCard: true, recurring: true, editRecurring: false },

  MemberEntry: KingdomFundingMemberEntry,

  buildChargeRequest: (ctx, token): ChargeRequest => {
    const endpoint = ctx.recurring ? "/donate/subscribe" : "/donate/charge";
    if (token.saved) return { endpoint, body: buildSavedMethodBody(ctx, token, "kingdomfunding") };
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
      type: "card",
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
