"use client";
import { createContext, useContext } from "react";
import type { Stripe } from "@stripe/stripe-js";

// Neutral bridge: lets components inside the Stripe wrapper read the instance without calling useStripe() directly.
export const StripeInstanceContext = createContext<Stripe | null>(null);
export const useStripeInstance = () => useContext(StripeInstanceContext);

// ponytail: one active Stripe gateway per page; thread through context instead if that ever changes.
let currentStripe: Stripe | null = null;
export const setCurrentStripe = (stripe: Stripe | null) => { currentStripe = stripe; };
export const getCurrentStripe = () => currentStripe;
