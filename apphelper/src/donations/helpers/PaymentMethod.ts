export interface PaymentMethod {
  id: string;
  type: "card" | "bank" | "paypal";
  provider: string;
  name: string;
  last4?: string;
  email?: string;
  gatewayId?: string;
}

export interface PaymentGateway {
  id: string;
  // Free-form: the payment-provider registry is the source of truth, keyed by
  // the normalized provider name. New providers need no change here.
  provider: string;
  publicKey?: string;
  productId?: string;
  payFees?: boolean;
  enabled?: boolean;
  currency?: string;
  environment?: string | null;
  settings?: Record<string, any>;
}
