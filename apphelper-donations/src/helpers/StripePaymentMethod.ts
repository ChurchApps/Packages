export class StripePaymentMethod {
  id: string;
  type: "card" | "bank" | "paypal";
  provider: "stripe" | "paypal";
  name: string;
  last4?: string;
  email?: string;
  exp_month?: string;
  exp_year?: string;
  status?: string;
  account_holder_name?: string;
  account_holder_type?: string;
  gatewayId?: string;

  constructor(obj?: any) {
    this.id = obj?.id || null;
    this.type = obj?.type || (obj?.object && obj.object === "bank_account" ? "bank" : "card");
    this.provider = obj?.provider || "stripe";
    this.name = obj?.card?.brand || obj?.bank_name || obj?.name || null;
    this.last4 = obj?.last4 || obj?.card?.last4 || null;
    this.email = obj?.email || null;
    this.exp_month = obj?.exp_month || obj?.card?.exp_month || null;
    this.exp_year = obj?.exp_year || obj?.card?.exp_year || null;
    this.status = obj?.status || null;
    this.account_holder_name = obj?.account_holder_name || "";
    this.account_holder_type = obj?.account_holder_type || "individual";
    this.gatewayId = obj?.gatewayId || obj?.gateway_id || obj?.gateway?.id || undefined;
  }
}
