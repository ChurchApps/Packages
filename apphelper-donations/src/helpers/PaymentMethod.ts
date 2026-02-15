export interface PaymentMethod {
  id: string;
  type: "card" | "bank" | "paypal";
  provider: "stripe" | "paypal";
  name: string;
  last4?: string;
  email?: string;
  gatewayId?: string;
}

export interface PaymentGateway {
  id: string;
  provider: "stripe" | "paypal" | "Stripe" | "Paypal" | "PayPal";
  publicKey?: string;
  productId?: string;
  payFees?: boolean;
  enabled?: boolean;
  currency?: string;
}
