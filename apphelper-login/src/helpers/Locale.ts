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
    "login": {
      "createAccount": "Create an Account",
      "email": "Email",
      "expiredLink": "The current link is expired.",
      "forgot": "Forgot Password",
      "goLogin": "Go to Login",
      "login": "Login",
      "password": "Password",
      "register": "Register",
      "registerThankYou": "Thank you for registering! Please check your email to verify your account.",
      "requestLink": "Request a new reset link",
      "reset": "Reset",
      "resetInstructions": "Enter your email address to request a password reset.",
      "resetPassword": "Reset Password",
      "resetSent": "Password reset email sent!",
      "setPassword": "Set Password",
      "signIn": "Sign In",
      "signInTitle": "Please Sign In",
      "verifyPassword": "Verify Password",
      "welcomeName": "Welcome back, <b>{}</b>! Please wait while we load your data.",
      "welcomeBack": "Welcome back",
      "validate": {
        "email": "Please enter a valid email address.",
        "firstName": "Please enter your first name.",
        "invalid": "Invalid login. Please check your email or password.",
        "lastName": "Please enter your last name.",
        "password": "Please enter a password.",
        "passwordLength": "Password must be at least 8 characters long.",
        "passwordMatch": "Passwords do not match.",
        "selectingChurch": "Error in selecting church. Please verify and try again"
      }
    },
    "selectChurch": {
      "address1": "Address Line 1",
      "address2": "Address Line 2",
      "another": "Choose another church",
      "city": "City",
      "confirmRegister": "Are you sure you wish to register a new church?",
      "country": "Country",
      "name": "Church Name",
      "noMatches": "No matches found.",
      "register": "Register a New Church",
      "selectChurch": "Select a Church",
      "state": "State / Province",
      "zip": "Zip / Postal Code",
      "validate": {
        "address": "Address cannot be blank.",
        "city": "City cannot be blank.",
        "country": "Country cannot be blank.",
        "name": "Church name cannot be blank.",
        "state": "State/Province cannot be blank.",
        "zip": "Zip/Postal code cannot be blank."
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
