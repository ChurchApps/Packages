import { FundDonationInterface } from "@churchapps/helpers";

export interface MultiGatewayDonationInterface {
  id: string;
  type: "card" | "bank" | "paypal";
  provider: "stripe" | "paypal";
  customerId?: string;
  gatewayId?: string;
  person?: {
    id?: string;
    email?: string;
    name?: string;
  };
  amount: number;
  billing_cycle_anchor?: number;
  interval?: {
    interval_count: number;
    interval: string;
  };
  funds?: FundDonationInterface[];
  notes?: string;
}
