import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { postAnonymous } = vi.hoisted(() => ({ postAnonymous: vi.fn() }));
vi.mock("@churchapps/helpers", () => ({ ApiHelper: { postAnonymous } }));

import { GuestCaptcha } from "../helpers/GuestCaptcha";

const dir = dirname(fileURLToPath(import.meta.url));
const files = [
  "../providers/stripe/NonAuthDonationInner.tsx",
  "../providers/paypal/PayPalNonAuthDonationInner.tsx",
  "../providers/paystack/PaystackNonAuthDonationInner.tsx",
  "../providers/kingdomfunding/KingdomFundingNonAuthDonationInner.tsx"
];
const read = (rel: string) => readFileSync(join(dir, rel), "utf8");
const moneyCall = /ApiHelper\.post(?:Anonymous)?\(\s*(?:[^,]*?"\/(?:donate\/(?:charge|subscribe|create-order)|paymentmethods\/(?:addcard|ach-setup-intent-anon))"[^,]*?),([\s\S]*?)"GivingApi"\s*\)/g;

beforeEach(() => postAnonymous.mockReset());

describe("GuestCaptcha", () => {
  it("asks the Api for a pass scoped to the church and keeps it on success", async () => {
    postAnonymous.mockResolvedValue({ response: "human", pass: "abc.def" });
    expect(await GuestCaptcha.verify("tok", "CHU1")).toEqual({ status: "success", pass: "abc.def" });
    expect(postAnonymous).toHaveBeenCalledWith("/donate/captcha-verify", { token: "tok", churchId: "CHU1" }, "GivingApi");
  });

  it("keeps no pass for a robot", async () => {
    postAnonymous.mockResolvedValue({ response: "robot" });
    expect(await GuestCaptcha.verify("tok", "CHU1")).toEqual({ status: "robot", pass: "" });
  });

  it("adds the pass to a request body only when there is one", () => {
    expect(GuestCaptcha.withPass({ amount: 5 }, "abc.def")).toEqual({ amount: 5, captchaPass: "abc.def" });
    expect(GuestCaptcha.withPass({ amount: 5 }, "")).toEqual({ amount: 5 });
  });
});

describe("guest donation forms send the captcha pass", () => {
  it("verify the captcha through GuestCaptcha", () => {
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).toContain("GuestCaptcha.verify(value, props.churchId)");
      expect(src, rel).not.toContain('"/donate/captcha-verify"');
    }
  });

  it("attach the pass to every guest money call", () => {
    for (const rel of files) {
      const calls = [...read(rel).matchAll(moneyCall)];
      expect(calls.length, rel).toBeGreaterThan(0);
      for (const call of calls) expect(call[1], `${rel}: ${call[0].slice(0, 80)}`).toContain("GuestCaptcha.withPass(");
    }
  });

  it("reset the widget and pass after a failed gift so a retry gets a fresh one", () => {
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).toMatch(/const resetCaptcha = \(\) => \{[\s\S]*?captchaPass\.current = "";[\s\S]*?captchaRef\.current\?\.reset\(\);/);
      expect((src.match(/resetCaptcha\(\);/g) || []).length, rel).toBeGreaterThan(0);
    }
  });
});
