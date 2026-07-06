import type { ReactNode, FC, ForwardRefExoticComponent, RefAttributes } from "react";
import type { PaymentGateway } from "../helpers";
import type { PersonInterface, QuestionInterface } from "@churchapps/helpers";
import type { PaperProps } from "@mui/material/Paper";

/** Uniform token from any provider's payment widget; id is provider's reference (PM id/nonce/order). */
export interface PaymentToken {
  id: string;
  type: "card" | "bank" | "paypal";
  saved?: boolean;
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
  // Set when the entry widget saved the method and created/looked-up a customer
  // (first-time Stripe donor has no customer until the card is saved).
  customerId?: string;
}

/** All payload builder context for a gift in flight; funds compact for all providers. */
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
  savedCard: boolean;
  savedBank: boolean;
  guestAch: boolean;
  memberNewCard: boolean;
  recurring: boolean;
  editRecurring: boolean;
  pauseRecurring?: boolean;
  // Entry widget saves the method as part of tokenize(), so no separate "save card" toggle applies.
  implicitSaveOnTokenize?: boolean;
}

export interface ProviderDescriptor {
  adminValue: string;
  label: string;
  keyLabels: { public: string; private: string; webhook?: string };
  feeFields: ("card" | "ach" | "paypal" | "kf")[];
  currencies: string[] | "all";
  selectableInAdmin: boolean;
  betaOnly?: boolean; // hidden in the admin dropdown in prod unless already configured
  setupInstructionsKey?: string;
  signupUrl?: (church: any, user: any) => string;
  currencyHelpUrl?: string;
  eventUrl?: (eventId: string) => string;
  // Per-currency default fee rates the admin fee-settings form seeds from.
  defaultFees?: Record<string, { percent: number; fixed: number; symbol: string }>;
}

export interface MemberEntryHandle {
  tokenize(): Promise<PaymentToken>;
}

export interface MemberEntryProps {
  gateway: PaymentGateway;
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

export interface MethodEditFormProps {
  method: any;
  verify?: boolean;
  customerId: string;
  person: PersonInterface;
  gateway?: PaymentGateway;
  onCancel: () => void;
  onDelete: () => void;
  onUpdated: (message?: string) => void;
}

export interface FormPaymentHandle {
  handlePayment(): Promise<{ paymentSuccessful: boolean; name?: string; errors: string[] }>;
  questionId?: string;
}

export interface FormPaymentProps {
  churchId: string;
  question: QuestionInterface;
  gateway: PaymentGateway;
}

export interface PaymentProvider {
  readonly key: string;
  readonly descriptor: ProviderDescriptor;
  readonly capabilities: ProviderCapabilities;

  // Loads the provider's own SDK from the gateway config (e.g. Stripe <Elements>).
  MemberWrapper?: FC<{ gateway?: PaymentGateway | null; children: ReactNode }>;
  MemberEntry?: ForwardRefExoticComponent<MemberEntryProps & RefAttributes<MemberEntryHandle>>;
  buildChargeRequest(ctx: ChargeContext, token: PaymentToken): ChargeRequest;
  finalizeResult?(result: any): Promise<FinalizeResult>;

  GuestForm: FC<GuestFormProps>;
  // Saved-method add/edit UI; providers without in-place editing omit it and get generic delete-only handling.
  MethodEditForm?: FC<MethodEditFormProps>;
  // Card entry for form "Payment" questions; providers without it can't take form payments.
  FormPayment?: ForwardRefExoticComponent<FormPaymentProps & RefAttributes<FormPaymentHandle>>;
}
