import { DonationHelper } from "../helpers";
import { StripeProvider } from "./StripeProvider";
import { KingdomFundingProvider } from "./KingdomFundingProvider";
import { PayPalProvider } from "./PayPalProvider";
import type { PaymentProvider } from "./types";

// Built-ins are referenced directly (not registered via a module side-effect),
// so bundlers can't tree-shake the registration away. Built lazily on first
// access so the providers/components import cycle is fully resolved by call time.
const custom = new Map<string, PaymentProvider>();
let builtins: Map<string, PaymentProvider> | null = null;

function getBuiltins(): Map<string, PaymentProvider> {
  if (!builtins) {
    builtins = new Map<string, PaymentProvider>();
    for (const p of [StripeProvider, KingdomFundingProvider, PayPalProvider]) builtins.set(p.key, p);
  }
  return builtins;
}

// Register an additional provider at runtime (e.g. a host app's custom gateway).
export function registerPaymentProvider(provider: PaymentProvider): void {
  custom.set(provider.key, provider);
}

// Resolves by normalized provider name. Falls back to Stripe so an unknown or
// misconfigured provider never hard-crashes the donor form.
export function getPaymentProvider(provider: string | undefined | null): PaymentProvider {
  const key = DonationHelper.normalizeProvider(provider || "");
  const all = getBuiltins();
  return custom.get(key) ?? all.get(key) ?? all.get("stripe")!;
}

export function hasPaymentProvider(provider: string | undefined | null): boolean {
  const key = DonationHelper.normalizeProvider(provider || "");
  return custom.has(key) || getBuiltins().has(key);
}

export function listPaymentProviders(): PaymentProvider[] {
  return [...getBuiltins().values(), ...custom.values()];
}
