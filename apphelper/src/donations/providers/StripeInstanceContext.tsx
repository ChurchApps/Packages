"use client";
import { createContext, useContext } from "react";
import type { Stripe } from "@stripe/stripe-js";

// Neutral bridge: lets the shared form read Stripe instance without calling useStripe() directly.
export const StripeInstanceContext = createContext<Stripe | null>(null);
export const useStripeInstance = () => useContext(StripeInstanceContext);
