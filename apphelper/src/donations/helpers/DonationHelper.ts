import type { Stripe, PaymentIntent } from "@stripe/stripe-js";

export interface ThreeDSResult {
  success: boolean;
  requiresAction: boolean;
  error?: string;
  paymentIntent?: PaymentIntent;
}

export class DonationHelper {

  static async handle3DSIfRequired(apiResult: any, stripe: Stripe | null): Promise<ThreeDSResult> {
    if (apiResult?.status !== "requires_action" || !apiResult?.client_secret) {
      return { success: false, requiresAction: false };
    }

    if (!stripe) {
      return { success: false, requiresAction: true, error: "Payment processor not available. Please try again." };
    }

    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(apiResult.client_secret);
      if (confirmError) {
        return { success: false, requiresAction: true, error: confirmError.message || "Authentication failed. Please try again." };
      }
      if (paymentIntent?.status === "succeeded") {
        return { success: true, requiresAction: true, paymentIntent };
      }
      return { success: false, requiresAction: true, error: "Payment authentication was not completed." };
    } catch (err: any) {
      return { success: false, requiresAction: true, error: err?.message || "An error occurred during authentication." };
    }
  }

  static getInterval(intervalName:string) {
    let intervalCount = 1;
    let intervalType = "month";
    if (!intervalName) return { interval_count: intervalCount, interval: intervalType };
    const parts = intervalName.split("_");
    if (parts.length === 2) {
      switch (parts[0]) {
        case "two": intervalCount = 2; break;
        case "three": intervalCount = 3; break;
      }
      intervalType = parts[1];
    }
    const result = { interval_count: intervalCount, interval: intervalType };
    return result;
  }

  static getIntervalKeyName(intervalCount: number, intervalType: string) {
    let firstPart = "one";
    if (intervalCount === 2) firstPart = "two";
    else if (intervalCount === 3) firstPart = "three";
    return firstPart + "_" + intervalType;
  }

  static normalizeProvider(provider: string): string {
    return provider?.toLowerCase() || "";
  }

  static isProvider(provider: string, expectedProvider: string): boolean {
    return this.normalizeProvider(provider) === this.normalizeProvider(expectedProvider);
  }

  static findGatewayByProvider(gateways: any[], provider: string): any {
    return gateways.find(g => this.isProvider(g.provider, provider));
  }

  // PayPal capture is money-in-hand only at COMPLETED/APPROVED.
  static isPayPalCaptureComplete(status?: string): boolean {
    return status === "COMPLETED" || status === "APPROVED";
  }

}
