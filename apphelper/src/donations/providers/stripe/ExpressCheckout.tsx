"use client";

import React, { useState } from "react";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe, StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { Box, Divider } from "@mui/material";
import { Locale } from "../../helpers";

export type WalletConfirm = (paymentMethodId: string, name: string, email: string) => Promise<boolean>;

interface Props {
  stripePromise?: Promise<Stripe | null> | null;
  amount: number;
  currency: string;
  onConfirm: WalletConfirm;
  onError: (messages: string[]) => void;
}

const ExpressCheckoutInner: React.FC<Pick<Props, "onConfirm" | "onError">> = ({ onConfirm, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [available, setAvailable] = useState(false);

  const handleConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) return;
    const { error: submitError } = await elements.submit();
    if (submitError) {
      onError([submitError.message || Locale.label("donation.donationForm.walletFailed")]);
      event.paymentFailed({ reason: "fail" });
      return;
    }
    const { error, paymentMethod } = await stripe.createPaymentMethod({ elements });
    if (error || !paymentMethod) {
      onError([error?.message || Locale.label("donation.donationForm.walletFailed")]);
      event.paymentFailed({ reason: "invalid_payment_data" });
      return;
    }
    const success = await onConfirm(paymentMethod.id, event.billingDetails?.name || "", event.billingDetails?.email || "");
    if (!success) event.paymentFailed({ reason: "fail" });
  };

  return (
    <>
      <ExpressCheckoutElement
        options={{
          emailRequired: true,
          buttonHeight: 48,
          paymentMethods: { link: "never", amazonPay: "never", paypal: "never", klarna: "never" }
        }}
        onReady={(event) => setAvailable(!!event.availablePaymentMethods)}
        onConfirm={handleConfirm}
      />
      {available && <Divider sx={{ mt: 2 }}>{Locale.label("donation.donationForm.orPayWith")}</Divider>}
    </>
  );
};

// Wallets need their own deferred-intent Elements group; the card fields keep the outer one.
export const StripeExpressCheckout: React.FC<Props> = ({ stripePromise, amount, currency, onConfirm, onError }) => {
  const lower = (currency || "usd").toLowerCase();
  // Stripe wants the smallest currency unit, and zero-decimal currencies are already there.
  const minorAmount = lower === "jpy" ? Math.round(amount) : Math.trunc(Math.round(amount * 100));
  if (!stripePromise || minorAmount < 50) return null;

  return (
    <Box data-testid="express-checkout" sx={{ mb: 2 }}>
      <Elements
        stripe={stripePromise}
        options={{ mode: "payment", amount: minorAmount, currency: lower, paymentMethodCreation: "manual" }}
      >
        <ExpressCheckoutInner onConfirm={onConfirm} onError={onError} />
      </Elements>
    </Box>
  );
};
