import type { Stripe, SetupIntent, StripeError } from "@stripe/stripe-js";

export const isPadCurrency = (currency?: string) => (currency || "usd").toLowerCase() === "cad";

// CAD gateways collect Canadian pre-authorized debit (acss_debit) via Stripe's hosted modal;
// everything else uses Financial Connections for US ACH.
export async function collectStripeBank(stripe: Stripe, clientSecret: string, currency: string | undefined, billing: { name: string; email: string }): Promise<{ error?: StripeError; setupIntent?: SetupIntent }> {
  if (isPadCurrency(currency)) {
    return await stripe.confirmAcssDebitSetup(clientSecret, { payment_method: { billing_details: billing } });
  }
  const collected = await stripe.collectBankAccountForSetup({
    clientSecret,
    params: { payment_method_type: "us_bank_account", payment_method_data: { billing_details: billing } }
  });
  if (collected.error) return { error: collected.error };
  if (!collected.setupIntent?.payment_method) return { error: { type: "validation_error", message: "Bank account connection was not completed. Please try again." } as StripeError };
  return await stripe.confirmUsBankAccountSetup(clientSecret);
}
