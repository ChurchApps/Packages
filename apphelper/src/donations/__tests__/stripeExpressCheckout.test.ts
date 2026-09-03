import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

describe("stripe express checkout (Apple Pay / Google Pay)", () => {
  const expressCheckout = read("../providers/stripe/ExpressCheckout.tsx");
  const guestForm = read("../providers/stripe/NonAuthDonationInner.tsx");
  const provider = read("../providers/stripe/StripeProvider.tsx");

  it("mounts the element in a deferred-intent Elements group that allows manual payment methods", () => {
    expect(expressCheckout).toContain('data-testid="express-checkout"');
    expect(expressCheckout).toContain('mode: "payment"');
    expect(expressCheckout).toContain('paymentMethodCreation: "manual"');
    expect(expressCheckout).toContain("elements.submit()");
    expect(expressCheckout).toContain("stripe.createPaymentMethod({ elements })");
  });

  it("keeps the wallet to Apple Pay and Google Pay", () => {
    expect(expressCheckout).toContain('link: "never"');
    expect(expressCheckout).toContain('paypal: "never"');
  });

  it("shows the wallet only for one-time gifts once an amount is set", () => {
    expect(guestForm).toContain('donationType === "once" && total > 0 && gateway?.provider?.toLowerCase() === "stripe"');
  });

  it("passes the guest form's Stripe instance down instead of loading a second one", () => {
    expect(provider).toContain("stripePromise={stripePromise}");
    expect(expressCheckout).not.toContain("loadStripe");
  });

  it("registers the wallet domain once per session", () => {
    expect(guestForm).toContain('ApiHelper.postAnonymous("/donate/register-domain"');
    expect(guestForm).toContain("window.sessionStorage.getItem(key)");
  });
});
