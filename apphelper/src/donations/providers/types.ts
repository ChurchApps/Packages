import type { ReactNode, FC, ForwardRefExoticComponent, RefAttributes } from "react";
import type { Stripe } from "@stripe/stripe-js";
import type { PaymentGateway } from "../helpers";
import type { PaperProps } from "@mui/material/Paper";

// Uniform token produced by any provider's payment-entry widget (or a reused
// saved method). `id` is the provider's reference: Stripe payment-method id,
// Kingdom Funding nonce, or PayPal order id.
export interface PaymentToken {
  id: string;
  type: "card" | "bank" | "paypal";
  saved?: boolean;
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
}

// Everything the payload builder needs about the gift in flight. Funds are
// compact ({id, amount}) for every provider — the shape the server already
// accepts on the KF/PayPal paths.
export interface ChargeContext {
  provider: string;
  gatewayId?: string;
  churchId: string;
  amount: number;
  funds: { id: string; amount: number }[];
  person: { id: string; email: string; name: string };
  notes?: string;
  church: { name: string; subDomain: string; churchURL: string; logo: string };
  recurring: boolean;
  interval?: { interval_count: number; interval: string };
  billingCycleAnchor?: number;
  saveCard?: boolean;
  customerId?: string;
  currency?: string;
}

export interface ChargeRequest {
  endpoint: "/donate/charge" | "/donate/subscribe";
  body: any;
}

export interface FinalizeResult {
  result: any;
  requiresAction?: boolean;
  success?: boolean;
  error?: string;
}

export interface ProviderCapabilities {
  savedCard: boolean;     // store + reuse cards (member flow)
  savedBank: boolean;     // store + reuse ACH, and offer "add bank"
  guestAch: boolean;      // ACH option in the guest donor form
  memberNewCard: boolean; // offer "enter new card" inline during a member donation
  recurring: boolean;
  editRecurring: boolean; // edit an existing subscription's payment method
}

export interface ProviderDescriptor {
  // Stored gateway provider value as the admin/db uses it (Title-case), so the
  // settings screen can build its dropdown straight from the registry.
  adminValue: string;
  label: string;
  keyLabels: { public: string; private: string; webhook?: string };
  feeFields: ("card" | "ach" | "paypal" | "kf")[];
  currencies: string[] | "all";
  selectableInAdmin: boolean;
  betaOnly?: boolean; // hidden in the admin dropdown in prod unless already configured
  setupInstructionsKey?: string;
  signupUrl?: (church: any, user: any) => string;
}

export interface MemberEntryHandle {
  tokenize(): Promise<PaymentToken>;
}

export interface MemberEntryProps {
  gateway: PaymentGateway;
  // Providers that build a server-side order at tokenize time (PayPal) read
  // live amount/funds through this; Stripe/KF ignore it.
  getContext?: () => ChargeContext;
}

export interface GuestFormProps {
  churchId: string;
  gateway: PaymentGateway;
  recaptchaSiteKey: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  churchLogo?: string;
  allowSingleGift?: boolean;
  allowRecurring?: boolean;
  showFundSelector?: boolean;
  allowedFundIds?: string[];
  defaultFundId?: string;
}

export interface PaymentProvider {
  readonly key: string;
  readonly descriptor: ProviderDescriptor;
  readonly capabilities: ProviderCapabilities;

  // Member donation -----------------------------------------------------------
  // Optional SDK/context wrapper around the member form (Stripe -> <Elements>).
  MemberWrapper?: FC<{ stripePromise?: Promise<Stripe | null> | null; children: ReactNode }>;
  // Inline widget to capture a NEW payment during a member donation. Undefined
  // for providers that only charge saved methods (Stripe member flow).
  MemberEntry?: ForwardRefExoticComponent<MemberEntryProps & RefAttributes<MemberEntryHandle>>;
  // token + context -> API request. The one place payload shape differs.
  buildChargeRequest(ctx: ChargeContext, token: PaymentToken): ChargeRequest;
  // Post-charge handling (Stripe 3DS). Default = pass-through.
  finalizeResult?(result: any, deps: { stripe?: Stripe | null }): Promise<FinalizeResult>;

  // Guest (unauthenticated) donation -------------------------------------------
  GuestForm: FC<GuestFormProps>;
}
