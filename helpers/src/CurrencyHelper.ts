import { ApiHelper } from "./ApiHelper.js";

type RatesCache = {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
};

export class CurrencyHelper {
  static CACHE_KEY = "exchange_rates_cache";
  static CACHE_EXPIRATION = 12 * 60 * 60 * 1000; // 12 hours
  // Rates for the church's base currency, cached in memory by initializeExchangeRates()
  // so conversions don't each have to fetch or be handed a rates map.
  static rates: Record<string, number> = {};
  static currentBase = "";

  static loadCurrency = async () => {
    const gateways = await ApiHelper.get("/gateways", "GivingApi");
    if (gateways.length === 0) return "usd";
    return gateways[0].currency || "usd";
  };

  static formatCurrency(amount: number) {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  }

  static formatCurrencyWithLocale(
    amount: number,
    currency: string = "usd",
    fractionDigits: number = 2
  ) {
    const symbol = this.getCurrencySymbol(currency);

    const normalizedCurrency = currency.toUpperCase();
    const locale = this.getLocaleForCurrency(normalizedCurrency);

    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "code",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });

    // replace the currency code with the symbol
    const formattedAmount = formatter.format(amount);
    return formattedAmount.replace(normalizedCurrency, symbol);
  }

  static getCurrencySymbol(currency?: string) {
    const normalizedCurrency = currency?.toLowerCase() || "usd";
    const stripeCurrencyFees: any = {
      usd: { percent: 2.9, fixed: 0.3, symbol: "$" },
      eur: { percent: 2.9, fixed: 0.25, symbol: "€" },
      gbp: { percent: 2.9, fixed: 0.2, symbol: "£" },
      cad: { percent: 2.9, fixed: 0.3, symbol: "C$" },
      aud: { percent: 2.9, fixed: 0.3, symbol: "A$" },
      inr: { percent: 2.9, fixed: 3.0, symbol: "₹" },
      jpy: { percent: 2.9, fixed: 30.0, symbol: "¥" },
      sgd: { percent: 2.9, fixed: 0.5, symbol: "S$" },
      hkd: { percent: 2.9, fixed: 2.35, symbol: "元" },
      sek: { percent: 2.9, fixed: 2.5, symbol: "SEK" },
      nok: { percent: 2.9, fixed: 2.0, symbol: "NOK" },
      dkk: { percent: 2.9, fixed: 1.8, symbol: "DKK" },
      chf: { percent: 2.9, fixed: 0.3, symbol: "CHF" },
      mxn: { percent: 2.9, fixed: 3.0, symbol: "MXN" },
      brl: { percent: 3.9, fixed: 0.5, symbol: "R$" }
    };
    return stripeCurrencyFees[normalizedCurrency]?.symbol || "$";
  }

  private static getLocaleForCurrency(currency: string): string {
    const currencyLocaleMap: { [key: string]: string } = {
      USD: "en-US",
      EUR: "en-GB",
      GBP: "en-GB",
      CAD: "en-CA",
      AUD: "en-AU",
      INR: "en-IN",
      JPY: "ja-JP",
      SGD: "en-SG",
      HKD: "en-HK",
      SEK: "sv-SE",
      NOK: "nb-NO",
      DKK: "da-DK",
      CHF: "de-CH",
      MXN: "es-MX",
      BRL: "pt-BR"
    };

    return currencyLocaleMap[currency] || "en-US";
  }

  // Populate the in-memory rate cache for the church's base currency. Call once at app start;
  // it no-ops when the base currency is unchanged and rates are already loaded.
  static async initializeExchangeRates() {
    const baseCurrency = await this.loadCurrency();
    if (baseCurrency === this.currentBase && Object.keys(this.rates).length > 0) return;
    this.currentBase = baseCurrency;
    this.rates = await this.getExchangeRates(baseCurrency);
  }

  static async getExchangeRates(
    baseCurrency: string
  ): Promise<Record<string, number>> {
    // Keyed per base currency so switching bases doesn't return the wrong cached rates.
    const cacheKey = `${this.CACHE_KEY}_${baseCurrency}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      const parsed: RatesCache = JSON.parse(cached);
      const expired = Date.now() - parsed.timestamp > this.CACHE_EXPIRATION;

      if (!expired && parsed.base === baseCurrency) {
        return parsed.rates;
      }
    }

    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${baseCurrency}`
    );
    const data = await response.json();

    const cache: RatesCache = {
      base: baseCurrency,
      rates: data.rates,
      timestamp: Date.now()
    };

    localStorage.setItem(cacheKey, JSON.stringify(cache));

    return data.rates;
  }

  static convertDonation(
    donation: { currency: string; amount: number },
    targetCurrency: string,
    withCurrencyLabel: boolean = true
  ) {
    const converted = this.convertAmount(
      Number(donation.amount || 0),
      donation.currency?.toUpperCase() || "USD",
      targetCurrency
    );

    if (!withCurrencyLabel) return Number(converted).toFixed(2);

    return this.formatCurrencyWithLocale(converted, targetCurrency);
  }

  static convertDonationTotals(
    donations: { currency: string; amount: number }[],
    targetCurrency: string
  ) {
    const grouped: Record<string, number> = {};

    donations.forEach((donation) => {
      const currency = donation.currency?.toUpperCase() || "USD";
      grouped[currency] = (grouped[currency] || 0) + Number(donation.amount || 0);
    });

    let total = 0;

    Object.entries(grouped).forEach(([currency, amount]) => {
      total += this.convertAmount(amount, currency, targetCurrency);
    });

    return this.formatCurrencyWithLocale(total, targetCurrency);
  }

  static convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number {
    const from = (fromCurrency || "USD").toUpperCase();
    const to = (toCurrency || "USD").toUpperCase();

    if (from === to) {
      return amount;
    }

    const rate = this.rates[from];

    if (!rate) {
      return amount;
    }

    return Number((amount / rate).toFixed(2));
  }

  static convertAmountWithLocale(
    amount: number,
    donationCurrency: string,
    selectedCurrency: string
  ) {
    const converted = this.convertAmount(
      amount,
      donationCurrency,
      selectedCurrency
    );

    return this.formatCurrencyWithLocale(converted, selectedCurrency);
  }
}
