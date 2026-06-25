"use client";
import { createContext, useContext } from "react";
import type { Stripe } from "@stripe/stripe-js";

// Neutral bridge: lets the shared member-donation form read the Stripe instance
// (needed only for 3DS finalize) without calling useStripe() directly — which
// throws for non-Stripe providers that render no <Elements> context.
export const StripeInstanceContext = createContext<Stripe | null>(null);
export const useStripeInstance = () => useContext(StripeInstanceContext);
