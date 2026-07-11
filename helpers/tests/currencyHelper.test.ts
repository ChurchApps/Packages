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
  CurrencyHelper.rates = {};
  assert.equal(CurrencyHelper.convertAmount(50, "usd", "USD"), 50);
  assert.equal(CurrencyHelper.convertAmount(50, "usd", "eur"), 50);
});

test("convertAmount divides by the source currency's cached rate and rounds to 2 decimals", () => {
  CurrencyHelper.rates = { USD: 2 };
  assert.equal(CurrencyHelper.convertAmount(100, "usd", "eur"), 50);
  // 100 / 3 = 33.333... rounds to 33.33
  CurrencyHelper.rates = { USD: 3 };
  assert.equal(CurrencyHelper.convertAmount(100, "usd", "eur"), 33.33);
});

test("convertAmount tolerates a null/undefined currency instead of throwing", () => {
  CurrencyHelper.rates = {};
  assert.equal(CurrencyHelper.convertAmount(50, undefined as unknown as string, "eur"), 50);
  assert.equal(CurrencyHelper.convertAmount(50, "eur", null as unknown as string), 50);
});

test("convertDonation converts and formats a single donation using the cached rates", () => {
  CurrencyHelper.rates = { USD: 2 };
  const formatted = CurrencyHelper.convertDonation({ currency: "usd", amount: 100 }, "eur");
  assert.ok(formatted.includes("€"), formatted);
  assert.ok(formatted.includes("50"), formatted);
});

test("convertDonation with withCurrencyLabel=false returns a bare 2-decimal amount", () => {
  CurrencyHelper.rates = { USD: 2 };
  assert.equal(CurrencyHelper.convertDonation({ currency: "usd", amount: 100 }, "eur", false), "50.00");
});

test("convertDonationTotals groups by currency before converting and summing", () => {
  CurrencyHelper.rates = { USD: 2 };
  const donations = [
    { currency: "usd", amount: 100 },
    { currency: "usd", amount: 50 },
    { currency: "eur", amount: 10 }
  ];
  // usd group (150) / rate 2 = 75, plus eur group (10, same-currency passthrough) = 85
  const formatted = CurrencyHelper.convertDonationTotals(donations, "eur");
  assert.ok(formatted.includes("85"), formatted);
});

test("initializeExchangeRates caches rates once and no-ops while the base is unchanged", async (t) => {
  CurrencyHelper.rates = {};
  CurrencyHelper.currentBase = "";
  t.mock.method(CurrencyHelper, "loadCurrency", async () => "usd");
  const getRates = t.mock.method(CurrencyHelper, "getExchangeRates", async () => ({ EUR: 0.9 }));

  await CurrencyHelper.initializeExchangeRates();
  assert.deepEqual(CurrencyHelper.rates, { EUR: 0.9 });
  assert.equal(CurrencyHelper.currentBase, "usd");
  assert.equal(getRates.mock.callCount(), 1);

  // Same base + rates already loaded → should short-circuit without refetching.
  await CurrencyHelper.initializeExchangeRates();
  assert.equal(getRates.mock.callCount(), 1);
});
