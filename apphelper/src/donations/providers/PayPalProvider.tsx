"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { ApiHelper } from "@churchapps/helpers";
import { PayPalHostedFields, PayPalHostedFieldsHandle } from "../components/PayPalHostedFields";
import { PayPalNonAuthDonationInner } from "../components/PayPalNonAuthDonationInner";
import type {
  PaymentProvider, GuestFormProps, ChargeRequest, PaymentToken,
  MemberEntryHandle, MemberEntryProps
} from "./types";

// Member PayPal entry — Hosted Fields create a server-side order at submit time,
// so it reads live amount/funds through getContext(). tokenize() returns the
// captured order id.
const PayPalMemberEntry = forwardRef<MemberEntryHandle, MemberEntryProps>(({ gateway, getContext }, ref) => {
  const hostedRef = useRef<PayPalHostedFieldsHandle>(null);
  useImperativeHandle(ref, () => ({
    tokenize: async (): Promise<PaymentToken> => {
      const payload = await hostedRef.current?.submit();
      const orderId = (payload as any)?.orderId || (payload as any)?.id || "";
      return { id: orderId, type: "paypal" };
    }
  }));
  return (
    <PayPalHostedFields
      ref={hostedRef}
      clientId={gateway.publicKey || ""}
      getClientToken={async () => {
        try {
          const ctx = getContext?.();
          const resp = await ApiHelper.post(
            "/donate/client-token",
            { churchId: ctx?.churchId || "", provider: "paypal", gatewayId: gateway.id },
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
          const ctx = getContext?.();
          const resp = await ApiHelper.post(
            "/donate/create-order",
            {
              churchId: ctx?.churchId || "",
              provider: "paypal",
              gatewayId: gateway.id,
              amount: ctx?.amount,
              currency: (ctx?.currency || "USD").toUpperCase(),
              funds: ctx?.funds || [],
              notes: ctx?.notes || ""
            },
            "GivingApi"
          );
          return resp?.id || resp?.orderId || "";
        } catch {
          return "";
        }
      }}
    />
  );
});
PayPalMemberEntry.displayName = "PayPalMemberEntry";

const PayPalGuestForm: React.FC<GuestFormProps> = (props) => (
  <PayPalNonAuthDonationInner
    churchId={props.churchId}
    mainContainerCssProps={props.mainContainerCssProps}
    showHeader={false}
    recaptchaSiteKey={props.recaptchaSiteKey}
    churchLogo={props?.churchLogo}
    paypalClientId={props.gateway?.publicKey || null}
    allowSingleGift={props.allowSingleGift}
    // PayPal has no subscribe path (capabilities.recurring=false); never offer
    // a recurring toggle that would silently downgrade to a one-time charge.
    allowRecurring={false}
    showFundSelector={props.showFundSelector}
    allowedFundIds={props.allowedFundIds}
    defaultFundId={props.defaultFundId}
  />
);

export const PayPalProvider: PaymentProvider = {
  key: "paypal",
  descriptor: {
    adminValue: "Paypal",
    label: "PayPal",
    keyLabels: { public: "settings.givingSettingsEdit.clientId", private: "settings.givingSettingsEdit.clientSecret" },
    feeFields: ["paypal"],
    currencies: [],
    selectableInAdmin: false,
    setupInstructionsKey: "settings.givingSettingsEdit.paypalSetup",
    signupUrl: () => "https://developer.paypal.com/"
  },
  // PayPal has no saved-method vault and no member subscribe path today; charges
  // are one-time via captured orders.
  capabilities: { savedCard: false, savedBank: false, guestAch: false, memberNewCard: false, recurring: false, editRecurring: false, pauseRecurring: false },

  MemberEntry: PayPalMemberEntry,

  buildChargeRequest: (ctx, token): ChargeRequest => ({
    endpoint: "/donate/charge",
    body: {
      provider: "paypal",
      gatewayId: ctx.gatewayId,
      id: token.id,
      churchId: ctx.churchId,
      amount: ctx.amount,
      funds: ctx.funds,
      person: ctx.person,
      notes: ctx.notes || ""
    }
  }),

  GuestForm: PayPalGuestForm
};
