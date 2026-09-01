import { describe, expect, it } from "vitest";
import { Locale } from "../helpers/Locale";

// The SSO button labels were silently dropped by a locale sync, which left the raw
// keys rendering on the login screen. Pin the English strings, not the keys.
describe("SSO button labels (login Locale)", () => {
  it("resolves the Google label from the English fallbacks", () => {
    expect(Locale.label("login.continueGoogle")).toBe("Continue with Google");
  });

  it("resolves the Microsoft label from the English fallbacks", () => {
    expect(Locale.label("login.continueMicrosoft")).toBe("Continue with Microsoft");
  });
});
