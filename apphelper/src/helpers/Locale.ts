import i18n from "i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import LanguageDetector from "i18next-browser-languagedetector";

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
    "b1Share": {
      "comment": "Comment",
      "commentPlaceholder": "Include a comment with your post.",
      "contentShared": "Content Shared",
      "group": "Group",
      "sharingToGroup": "Sharing {} to B1 Group",
      "validate": {
        "addComment": "Please add a comment.",
        "loginFirst": "Please login first.",
        "notMember": "You are not currently a member of any groups on B1.",
        "selectGroup": "Please select a group."
      }
    },
    "common": {
      "add": "Add",
      "cancel": "Cancel",
      "close": "Close",
      "date": "Date",
      "delete": "Delete",
      "edit": "Edit",
      "error": "Error",
      "pleaseWait": "Please wait...",
      "save": "Save",
      "search": "Search",
      "submit": "Submit",
      "update": "Update"
    },
    "createPerson": {
      "addNewPerson": "Add a New Person",
      "firstName": "First Name",
      "lastName": "Last Name",
      "email": "Email"
    },
    "donation": {
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
      "common": {
        "cancel": "Cancel",
        "error": "Error"
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
      "page": {
        "amount": "Amount",
        "batch": "Batch",
        "date": "Date",
        "fund": "Fund",
        "method": "Method",
        "willAppear": "Donations will appear once a donation has been entered."
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
        "every": "Every",
        "interval": "Interval",
        "notFound": "Payment method not found.",
        "paymentMethod": "Payment Method",
        "startDate": "Start Date"
      }
    },
    "formSubmissionEdit": {
      "confirmDelete": "Are you sure you wish to delete this form data?",
      "editForm": "Edit Form",
      "isRequired": "is required",
      "submit": "Submit"
    },
    "gallery": {
      "aspectRatio": "Aspect Ratio",
      "confirmDelete": "Are you sure you wish to delete this image from gallery?",
      "freeForm": "Free Form"
    },
    "iconPicker": {
      "iconsAvailable": "icons available",
      "matchingResults": "matching results",
      "search": "Search icons..."
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
      "validate": {
        "email": "Please enter a valid email address.",
        "firstName": "Please enter your first name.",
        "invalid": "Invalid login. Please check your email or password.",
        "lastName": "Please enter your last name.",
        "password": "Please enter a password.",
        "passwordLength": "Password must be at least 8 characters long.",
        "passwordMatch": "Passwords do not match.",
        "selectingChurch": "Error in selecting church. Please verify and try again"
      },
      "welcomeBack": "Welcome back",
      "welcomeName": "Welcome back, <b>{}</b>! Please wait while we load your data."
    },
    "markdownEditor": {
      "content": "Content",
      "markdownEditor": "Markdown Editor",
      "markdownGuide": "Markdown Guide"
    },
    "month": {
      "april": "April",
      "august": "August",
      "december": "December",
      "february": "February",
      "january": "January",
      "july": "July",
      "june": "June",
      "march": "March",
      "may": "May",
      "november": "November",
      "october": "October",
      "september": "September"
    },
    "notes": {
      "comment": "comment",
      "comments": "comments",
      "notes": "Notes",
      "startConversation": "Start a conversation",
      "validate": { "content": "Please enter a note." },
      "viewAll": "View all"
    },
    "person": {
      "email": "Email",
      "firstName": "First Name",
      "lastName": "Last Name",
      "name": "Name",
      "person": "Person",
      "years": "years",
      "noRec": "Don't have a person record?"
    },
    "reporting": {
      "detailed": "Detailed Report",
      "summary": "Summary",
      "sampleTemplate": "Sample Word Template",
      "downloadOptions": "Download Options",
      "noData": "There is no data to display.",
      "runReport": "Run Report",
      "useFilter": "Use the filter to run the report."
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
    },
    "stockPhotos": {
      "photoBy": "Photo by:",
      "providedBy": "Stock photos provided by"
    },
    "support": {
      "documentation": "Documentation",
      "discussions": "Support Forum"
    },
    "wrapper": {
      "chatWith": "Chat with",
      "deleteChurch": "Delete",
      "logout": "Logout",
      "messages": "Messages",
      "newPrivateMessage": "New Private Message",
      "notifications": "Notifications",
      "privateMessage": "Private Message",
      "privateConversation": "Private Conversation",
      "profile": "Profile",
      "searchForPerson": "Search for a person",
      "support": "Support",
      "sureRemoveChurch": "Are you sure you wish to delete this church? You no longer will be a member of {}.",
      "switchApp": "Switch App",
      "switchChurch": "Switch Church"
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
      for (const backend of backends) {
        const url = backend.replace("{{lng}}", lang);
        try {
          const data = await fetch(url).then((response) => response.json());
          resources[lang].translation = this.deepMerge(
            resources[lang].translation,
            data
          );
        } catch (error) {
          // If fetching fails, we'll rely on the hard-coded fallbacks
          console.warn(`Failed to load translations from ${url}:`, error);
        }
      }
    }

    // Initialize i18n
    await i18n
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
  static label(key: string, fallback?: string): string {
    const translation = this.t(key);
    // If translation equals the key, it means no translation was found
    if (translation === key && fallback) {
      return fallback;
    }
    return translation;
  }

  // Helper method to check if i18n is initialized
  static isInitialized(): boolean {
    return i18n && i18n.isInitialized;
  }

  // Method to set up basic fallback-only mode (no i18n)
  static setupFallbackMode(): void {
    // This method can be called if apps want to use only the hard-coded fallbacks
    // without initializing the full i18n system
  }
}
