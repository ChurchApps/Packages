import { test } from "node:test";
import assert from "node:assert/strict";

import { CurrencyHelper } from "../src/CurrencyHelper";

test("formatCurrency formats a number as USD with 2 decimal places", () => {
  assert.equal(CurrencyHelper.formatCurrency(5), "$5.00");
  assert.equal(CurrencyHelper.formatCurrency(1234.5), "$1,234.50");
  assert.equal(CurrencyHelper.formatCurrency(0), "$0.00");
});

test("getCurrencySymbol resolves known currencies case-insensitively and defaults to $", () => {
  assert.equal(CurrencyHelper.getCurrencySymbol("usd"), "$");
  assert.equal(CurrencyHelper.getCurrencySymbol("EUR"), "€");
  assert.equal(CurrencyHelper.getCurrencySymbol("GBP"), "£");
  assert.equal(CurrencyHelper.getCurrencySymbol("not-a-currency"), "$");
  assert.equal(CurrencyHelper.getCurrencySymbol(undefined), "$");
});

test("formatCurrencyWithLocale renders amount with the currency's symbol, not its ISO code", () => {
  const usd = CurrencyHelper.formatCurrencyWithLocale(10, "usd");
  assert.ok(usd.includes("$"), usd);
  assert.ok(!usd.includes("USD"), usd);

  const eur = CurrencyHelper.formatCurrencyWithLocale(10, "eur", 0);
  assert.ok(eur.includes("€"), eur);
});

test("convertAmount returns the input amount unchanged when currencies match or the rate is missing", () => {
  assert.equal(CurrencyHelper.convertAmount(50, "usd", "USD", {}), 50);
  assert.equal(CurrencyHelper.convertAmount(50, "usd", "eur", {}), 50);
});

test("convertAmount divides by the target's rate relative to the base currency", () => {
  // rates keyed by the *source* currency here, per convertAmount's `rates[from]` lookup
  const result = CurrencyHelper.convertAmount(100, "usd", "eur", { USD: 2 });
  assert.equal(result, 50);
});

test("convertDonation converts and formats a single donation using its own currency", () => {
  const formatted = CurrencyHelper.convertDonation({ currency: "usd", amount: 100 }, { USD: 2 }, "eur");
  assert.ok(formatted.includes("€"), formatted);
});

test("convertDonationTotals groups by currency before converting and summing", () => {
  const donations = [
    { currency: "usd", amount: 100 },
    { currency: "usd", amount: 50 },
    { currency: "eur", amount: 10 }
  ];
  // usd group (150) / rate 2 = 75, plus eur group (10, same-currency passthrough) = 85
  const formatted = CurrencyHelper.convertDonationTotals(donations, { USD: 2 }, "eur");
  assert.ok(formatted.includes("85"), formatted);
});
