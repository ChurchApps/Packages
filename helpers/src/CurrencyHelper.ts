export class CurrencyHelper {
  static formatCurrency(amount: number) {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  }

  static formatCurrencyWithLocale(amount: number, currency: string = "USD") {
    const normalizedCurrency = currency.toUpperCase();
    const locale = this.getLocaleForCurrency(normalizedCurrency);

    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  }

  static getCurrencySymbol(currency?: string) {
    const normalizedCurrency = currency?.toLowerCase() || "usd";
    const stripeCurrencyFees: any = {
      usd: { percent: 2.9, fixed: 0.3, symbol: "$" },
      eur: { percent: 2.9, fixed: 0.25, symbol: "€" },
      gbp: { percent: 2.9, fixed: 0.2, symbol: "£" },
      cad: { percent: 2.9, fixed: 0.3, symbol: "$" },
      aud: { percent: 2.9, fixed: 0.3, symbol: "$" },
      inr: { percent: 2.9, fixed: 3.0, symbol: "₹" },
      jpy: { percent: 2.9, fixed: 30.0, symbol: "¥" },
      sgd: { percent: 2.9, fixed: 0.5, symbol: "S$" },
      hkd: { percent: 2.9, fixed: 2.35, symbol: "元" },
      sek: { percent: 2.9, fixed: 2.5, symbol: "kr" },
      nok: { percent: 2.9, fixed: 2.0, symbol: "kr" },
      dkk: { percent: 2.9, fixed: 1.8, symbol: "kr" },
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
}
