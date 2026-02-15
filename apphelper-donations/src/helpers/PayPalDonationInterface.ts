export interface PayPalDonationInterface {
  id: string;
  customerId: string;
  type: "paypal";
  provider: "paypal";
  gatewayId?: string;
  churchId?: string;
  person: {
    id: string;
    email: string;
    name: string;
  };
  amount: number;
  billing_cycle_anchor?: number;
  interval?: {
    interval: string;
    interval_count: number;
  };
  funds?: Array<{
    id: string;
    amount: number;
    name?: string;
  }>;
  notes?: string;
  cardData?: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    holderName: string;
  };
}
