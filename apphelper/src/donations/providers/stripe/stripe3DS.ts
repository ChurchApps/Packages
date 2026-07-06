import type { Stripe, PaymentIntent } from "@stripe/stripe-js";

export interface ThreeDSResult {
  success: boolean;
  requiresAction: boolean;
  error?: string;
  paymentIntent?: PaymentIntent;
}

export async function handle3DSIfRequired(apiResult: any, stripe: Stripe | null): Promise<ThreeDSResult> {
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
