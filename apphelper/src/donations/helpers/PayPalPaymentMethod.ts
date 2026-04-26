export interface PayPalPaymentMethod {
  id: string;
  type: "paypal";
  name: string;
  last4?: string;
  email?: string;
}
