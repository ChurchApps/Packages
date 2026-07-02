import i18n from "i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-chained-backend";

interface TranslationResources {
	[key: string]: {
		translation: Record<string, unknown>;
	};
}

interface ExtraLanguageCodes {
	[key: string]: string[];
}

export class Locale {
  private static readonly supportedLanguages: string[] = [
    "de",
    "en",
    "es",
    "fr",
    "hi",
    "it",
    "ko",
    "no",
    "pt",
    "ru",
    "tl",
    "zh"
  ];
  private static readonly extraCodes: ExtraLanguageCodes = { no: ["nb", "nn"] };

  // Hard-coded English fallbacks for when locale files are not available
  private static readonly englishFallbacks: Record<string, any> = {
    "common": {
      "pleaseWait": "Please wait...",
      "search": "Search",
      "cancel": "Cancel",
      "save": "Save",
      "delete": "Delete",
      "edit": "Edit",
      "add": "Add",
      "close": "Close",
      "date": "Date",
      "error": "Error",
      "submit": "Submit",
      "update": "Update"
    },
    "person": {
      "firstName": "First Name",
      "lastName": "Last Name",
      "email": "Email",
      "name": "Name",
      "person": "Person",
      "years": "years",
      "noRec": "Don't have a person record?"
    },
    "donation": {
      "common": {
        "cancel": "Cancel",
        "error": "Error"
      },
      "bankForm": {
        "accountNumber": "Account Number",
        "added": "Bank account added. Verify your bank account to make a donation.",
        "company": "Company",
        "firstDeposit": "First Deposit",
        "holderName": "Account holder name is required.",
        "individual": "Individual",
        "name": "Account Holder Name",
        "needVerified": "Bank accounts will need to be verified before making any donations. Your account will receive two small deposits in approximately 1-3 business days. You will need to enter those deposit amounts to finish verifying your account by selecting the verify account link next to your bank account under the payment methods section.",
        "routingNumber": "Routing Number",
        "secondDeposit": "Second Deposit",
        "twoDeposits": "Enter the two deposits you received in your account to finish verifying your bank account.",
        "updated": "Bank account updated.",
        "verified": "Bank account verified.",
        "validate": {
          "accountNumber": "Routing and account number are required.",
          "holderName": "Account holder name is required."
        }
      },
      "cardForm": {
        "addNew": "Add New Card",
        "added": "Card added successfully.",
        "expirationMonth": "Expiration Month:",
        "expirationYear": "Expiration Year:",
        "updated": "Card updated successfully."
      },
      "donationForm": {
        "annually": "Annually",
        "biWeekly": "Bi-Weekly",
        "cancelled": "Recurring donation cancelled.",
        "confirmDelete": "Are you sure you wish to delete this recurring donation?",
        "cover": "I'll generously add {} to cover the transaction fees so you can keep 100% of my donation.",
        "donate": "Donate",
        "editRecurring": "Edit Recurring Donation",
        "fees": "Transaction fees of {} are applied.",
        "frequency": "Frequency",
        "fund": "Fund",
        "funds": "Funds",
        "make": "Make a Donation",
        "makeRecurring": "Make a Recurring Donation",
        "method": "Method",
        "monthly": "Monthly",
        "notes": "Notes",
        "preview": "Preview Donation",
        "quarterly": "Quarterly",
        "recurringUpdated": "Recurring donation updated.",
        "startDate": "Start Date",
        "thankYou": "Thank you for your donation!",
        "tooLow": "Donation amount must be greater than $0.50",
        "total": "Total Donation Amount",
        "validate": {
          "amount": "Amount cannot be $0.",
          "email": "Please enter your email address.",
          "firstName": "Please enter your first name.",
          "lastName": "Please enter your last name.",
          "validEmail": "Please enter a valid email address."
        },
        "weekly": "Weekly"
      },
      "fundDonations": {
        "addMore": "Add More",
        "amount": "Amount",
        "fund": "Fund"
      },
      "paymentMethods": {
        "addBank": "Add Bank Account",
        "addCard": "Add Card",
        "confirmDelete": "Are you sure you wish to delete this payment method?",
        "deleted": "Payment method deleted.",
        "noMethod": "No payment methods. Add a payment method to make a donation.",
        "verify": "Verify Account"
      },
      "preview": {
        "date": "Donation Date",
        "donate": "Donate",
        "every": "Recurring Every",
        "fee": "Transaction Fee",
        "funds": "Funds",
        "method": "Donation Method",
        "notes": "Notes",
        "startingOn": "Starting On",
        "total": "Total",
        "type": "Donation Type",
        "weekly": "Weekly"
      },
      "recurring": {
        "amount": "Amount",
        "confirmPause": "Are you sure you want to pause this recurring donation?",
        "every": "Every",
        "interval": "Interval",
        "notFound": "Payment method not found.",
        "paused": "Paused",
        "pausedMessage": "Recurring donation paused.",
        "pauseFailed": "Failed to pause recurring donation. Please try again.",
        "pauseTooltip": "Pause recurring donation",
        "paymentMethod": "Payment Method",
        "resumedMessage": "Recurring donation resumed.",
        "resumeFailed": "Failed to resume recurring donation. Please try again.",
        "resumeTooltip": "Resume recurring donation",
        "startDate": "Start Date",
        "noSubscriptions": "No subscription found"
      },
      "kingdomFunding": {
        "providerName": "Kingdom Funding",
        "loadingPaymentForm": "Loading payment form...",
        "paymentFormNotAvailable": "Payment form not available",
        "paymentFormNotInitialized": "Payment form not initialized",
        "failedToInitPaymentForm": "Failed to initialize payment form",
        "failedToLoadPaymentForm": "Failed to load payment form",
        "failedToTokenizeCard": "Failed to tokenize card",
        "missingTokenizationKey": "Missing tokenization key",
        "failedToProcessCard": "Failed to process card. Please check your card details and try again.",
        "unexpectedError": "An unexpected error occurred. Please try again.",
        "errorProcessingDonation": "Error processing donation",
        "enterBankDetails": "Enter your bank account details",
        "enterCardDetails": "Enter card details",
        "payWithCard": "Card",
        "payWithBank": "Bank (ACH)",
        "gatewayConfigMissing": "Payment form not available. Gateway configuration missing.",
        "paymentProvider": "Payment Provider",
        "memo": "Memo (optional)",
        "validate": {
          "routingNumber": "Please enter a valid routing number",
          "accountNumber": "Please enter a valid account number",
          "captchaRequired": "Please complete the reCAPTCHA verification",
          "captchaFailed": "reCAPTCHA verification failed. Please try again."
        }
      }
    }
  };

  static init = async (backends: string[]): Promise<void> => {
    const resources: TranslationResources = {};
    let langs = ["en"];

    if (typeof navigator !== "undefined") {
      const browserLang = navigator.language.split("-")[0];
      const mappedLang
				= Object.keys(this.extraCodes).find((code) =>
				  this.extraCodes[code].includes(browserLang)) || browserLang;
      const notSupported = this.supportedLanguages.indexOf(mappedLang) === -1;
      langs = mappedLang === "en" || notSupported ? ["en"] : ["en", mappedLang];
    }

    // Load translations for each language
    for (const lang of langs) {
      resources[lang] = { translation: {} };
      try {
        for (const backend of backends) {
          const url = backend.replace("{{lng}}", lang);
          try {
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              resources[lang].translation = this.deepMerge(
                resources[lang].translation,
                data
              );
            }
          } catch (error) {
            console.warn(`Failed to load translations from ${url}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to load translations for language ${lang}:`, error);
      }
    }

    // Initialize i18n
    try {
      await i18n
        .use(Backend)
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
          resources,
          fallbackLng: "en",
          debug: false,
          interpolation: { escapeValue: false },
          detection: {
            order: ["navigator"],
            caches: ["localStorage"]
          }
        });
    } catch (error) {
      console.warn("Failed to initialize i18n:", error);
    }
  };

  private static deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    for (const key in source) {
      if (this.isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        this.deepMerge(
					target[key] as Record<string, unknown>,
					source[key] as Record<string, unknown>
        );
      } else Object.assign(target, { [key]: source[key] });
    }
    return target;
  }

  private static isObject(obj: unknown): boolean {
    return obj !== null && typeof obj === "object" && !Array.isArray(obj);
  }

  // Helper method to get value from nested object using dot notation
  private static getNestedValue(obj: Record<string, any>, path: string): any {
    if (!path) return undefined;
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // New helper method that uses i18n with hard-coded English fallback
  static t(key: string, options?: Record<string, unknown>): string {
    try {
      // Check if i18n is initialized and has the key
      if (i18n && i18n.isInitialized && i18n.exists(key)) {
        const translation = i18n.t(key, options);
        // If translation is not the same as the key, return it
        if (translation !== key) {
          return translation;
        }
      }
    } catch (error) {
      // If i18n fails, fall through to hard-coded fallback
      console.warn(`i18n translation failed for key "${key}":`, error);
    }

    // Fallback to hard-coded English translations
    const fallbackValue = this.getNestedValue(this.englishFallbacks, key);
    if (fallbackValue !== undefined) {
      // Handle simple string interpolation for options
      if (typeof fallbackValue === "string" && options) {
        let result = fallbackValue;
        Object.keys(options).forEach(optionKey => {
          const placeholder = `{{${optionKey}}}`;
          if (result.includes(placeholder)) {
            result = result.replace(new RegExp(placeholder, "g"), String(options[optionKey]));
          }
          // Also handle {} placeholder for backward compatibility
          if (result.includes("{}")) {
            result = result.replace("{}", String(options[optionKey]));
          }
        });
        return result;
      }
      return String(fallbackValue);
    }

    // If no fallback found, return the key itself
    return key;
  }

  // Keep the old method for backward compatibility
  static label(key: string): string {
    return this.t(key);
  }

  // Helper method to check if i18n is initialized
  static isInitialized(): boolean {
    return i18n && i18n.isInitialized;
  }

  // Method to set up basic fallback-only mode (no i18n)
  static initFallbackMode(): void {
    console.info("Locale: Running in fallback mode with English labels only");
  }
}
