import { DonationHelper } from "../helpers";
import type { PaymentGateway } from "../helpers";
import { StripeProvider } from "./stripe/StripeProvider";
import { KingdomFundingProvider } from "./kingdomfunding/KingdomFundingProvider";
import { PayPalProvider } from "./paypal/PayPalProvider";
import type { PaymentProvider, ProviderCapabilities } from "./types";

// Built lazily on first access so providers/components import cycle is fully resolved.
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

// Picks the church's primary gateway: registry order over enabled gateways,
// optionally requiring a capability, falling back to the first enabled entry.
export function pickDefaultGateway(gateways: PaymentGateway[] | undefined | null, capability?: keyof ProviderCapabilities): PaymentGateway | null {
  const enabled = (gateways || []).filter(g => g && g.enabled !== false);
  const eligible = capability ? enabled.filter(g => hasPaymentProvider(g.provider) && !!getPaymentProvider(g.provider).capabilities[capability]) : enabled;
  for (const p of listPaymentProviders()) {
    const match = eligible.find(g => DonationHelper.normalizeProvider(g.provider) === p.key);
    if (match) return match;
  }
  return eligible[0] || null;
}
