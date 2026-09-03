import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

const slice = (source: string, start: string, end: string) => {
  const from = source.indexOf(start);
  expect(from, `expected to find ${JSON.stringify(start)}`).toBeGreaterThan(-1);
  const to = source.indexOf(end, from + start.length);
  expect(to, `expected to find ${JSON.stringify(end)} after ${JSON.stringify(start)}`).toBeGreaterThan(-1);
  return source.slice(from, to);
};

describe("paypal smart buttons", () => {
  const sdk = read("../providers/paypal/paypalSdk.ts");
  const guest = read("../providers/paypal/PayPalNonAuthDonationInner.tsx");
  const provider = read("../providers/paypal/PayPalProvider.tsx");
  const donationForm = read("../components/MultiGatewayDonationForm.tsx");

  describe("sdk loading", () => {
    it("injects the buttons and hosted-fields SDK with venmo funding", () => {
      expect(sdk).toContain("https://www.paypal.com/sdk/js");
      expect(sdk).toContain("client-id=${encodeURIComponent(clientId)}");
      expect(sdk).toContain("components=buttons,hosted-fields");
      expect(sdk).toContain("enable-funding=venmo");
    });

    it("shares a single script tag between Buttons and Hosted Fields", () => {
      // The client token has to be on the tag before it loads, so the first caller wins
      // and every later caller gets the same promise back.
      expect(sdk).toContain("if (!sdkPromise || sdkClientId !== clientId)");
      expect(sdk).toContain("return sdkPromise;");
      expect(sdk).toContain("if (window.paypal) { resolve(window.paypal); return; }");
    });
  });

  describe("guest donation form", () => {
    it("shows the buttons only for one-time gifts when PayPal is configured", () => {
      expect(guest).toContain('{props.paypalClientId && donationType === "once" && (');
    });

    it("gates the order behind validation that does not require a card, and the captcha", () => {
      const startOrder = slice(guest, "const startWalletOrder", "const handleWalletApproval");
      expect(startOrder).toContain("if (!validate(false)) return \"\";");
      expect(startOrder).toContain("if (_captchaResponse !== \"success\") {");
      expect(startOrder).toContain("return \"\";");
    });

    it("saves an anonymous wallet gift without creating a user or person", () => {
      const approval = slice(guest, "const handleWalletApproval", "const validate =");
      const anonBranch = slice(approval, "if (anonymous) {", "try {");
      expect(anonBranch).toContain("savePayPalDonation(undefined, orderId)");
      expect(anonBranch).not.toContain("/users/loadOrCreate");
      expect(anonBranch).not.toContain("/people/loadOrCreate");
    });

    it("still creates the user and person for a named wallet gift", () => {
      const approval = slice(guest, "const handleWalletApproval", "const validate =");
      const namedBranch = approval.slice(approval.indexOf("try {"));
      expect(namedBranch).toContain('ApiHelper.post("/users/loadOrCreate"');
      expect(namedBranch).toContain('ApiHelper.post("/people/loadOrCreate"');
      expect(namedBranch).toContain("savePayPalDonation(person, orderId)");
    });

    it("skips the Hosted Fields submit when the wallet already approved an order", () => {
      const save = slice(guest, "const savePayPalDonation", "const createPayPalOrder");
      expect(save).toContain("let hostedOrderId: string | undefined = approvedOrderId;");
      expect(save).toContain("if (!hostedOrderId && props.paypalClientId && useHostedFields) {");
    });
  });

  describe("member entry", () => {
    it("hides the buttons for recurring gifts", () => {
      expect(provider).toContain("{!getContext?.().recurring && (");
    });

    it("tokenizes the approved order instead of submitting Hosted Fields", () => {
      const tokenize = slice(provider, "tokenize: async ()", "const getClientToken");
      expect(tokenize).toContain("if (approvedOrderRef.current) {");
      expect(tokenize).toContain('return { id: orderId, type: "paypal" };');
      expect(tokenize).toContain("await hostedRef.current?.submit()");
    });

    it("confirms approval with the shared locale label", () => {
      expect(provider).toContain('Locale.label("donation.paypal.approved")');
    });
  });

  describe("donation form", () => {
    it("treats a captured PayPal order as a successful gift", () => {
      const statuses = slice(donationForm, "const okStatuses", ";");
      expect(statuses).toContain('"COMPLETED"');
    });
  });
});
