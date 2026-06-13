export interface PaymentMethod {
  id: string;
  type: "card" | "bank" | "paypal";
  provider: "stripe" | "paypal" | "kingdomfunding";
  name: string;
  last4?: string;
  email?: string;
  gatewayId?: string;
}

export interface PaymentGateway {
  id: string;
  provider: "stripe" | "paypal" | "kingdomfunding" | "Stripe" | "Paypal" | "PayPal" | "KingdomFunding";
  publicKey?: string;
  productId?: string;
  payFees?: boolean;
  enabled?: boolean;
  currency?: string;
  environment?: string | null;
  settings?: Record<string, any>;
}
