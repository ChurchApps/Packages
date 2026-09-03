"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Alert } from "@mui/material";
import { ApiHelper } from "@churchapps/helpers";
import { PayPalHostedFields, PayPalHostedFieldsHandle } from "./PayPalHostedFields";
import { PayPalButtons } from "./PayPalButtons";
import { Locale } from "../../helpers";
import { PayPalNonAuthDonationInner } from "./PayPalNonAuthDonationInner";
import type {
  PaymentProvider, GuestFormProps, ChargeRequest, PaymentToken,
  MemberEntryHandle, MemberEntryProps
} from "../types";

// Hosted Fields create server-side order at submit; tokenize() returns order id.
// Smart Buttons approve an order up front, so tokenize() hands back the approved one when there is one.
const PayPalMemberEntry = forwardRef<MemberEntryHandle, MemberEntryProps>(({ gateway, getContext }, ref) => {
  const hostedRef = useRef<PayPalHostedFieldsHandle>(null);
  const approvedOrderRef = useRef<string>("");
  const [approved, setApproved] = useState(false);
  const [walletError, setWalletError] = useState("");

  useImperativeHandle(ref, () => ({
    tokenize: async (): Promise<PaymentToken> => {
      // ponytail: the wallet order is captured by the form's own Donate button, not inside the PayPal
      // window; upgrade path is a provider-owned submit hook on MultiGatewayDonationForm.
      if (approvedOrderRef.current) {
        const orderId = approvedOrderRef.current;
        approvedOrderRef.current = "";
        setApproved(false);
        return { id: orderId, type: "paypal" };
      }
      const payload = await hostedRef.current?.submit();
      const orderId = (payload as any)?.orderId || (payload as any)?.id || "";
      return { id: orderId, type: "paypal" };
    }
  }));

  const getClientToken = async () => {
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
  };

  const createOrder = async () => {
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
  };

  return (
    <>
      {!getContext?.().recurring && (
        <PayPalButtons
          clientId={gateway.publicKey || ""}
          getClientToken={getClientToken}
          createOrder={createOrder}
          onApprove={(orderId) => {
            approvedOrderRef.current = orderId;
            setApproved(!!orderId);
            setWalletError("");
          }}
          onError={(message) => setWalletError(message)}
        />
      )}
      {approved && <Alert severity="success" sx={{ mb: 1 }}>{Locale.label("donation.paypal.approved")}</Alert>}
      {walletError && <Alert severity="error" sx={{ mb: 1 }}>{walletError}</Alert>}
      <PayPalHostedFields
        ref={hostedRef}
        clientId={gateway.publicKey || ""}
        getClientToken={getClientToken}
        createOrder={createOrder}
      />
    </>
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
