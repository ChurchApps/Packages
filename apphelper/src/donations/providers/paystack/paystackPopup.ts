const INLINE_JS_URL = "https://js.paystack.co/v2/inline.js";

export interface PaystackChargeParams {
  key: string;
  email: string;
  amount: number; // major units; converted to subunits here
  currency: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
}

export interface PaystackChargeResult {
  reference: string;
  status?: string;
}

// Every Paystack currency has 2 subunits (kobo, pesewas, cents).
export const toSubunits = (amount: number): number => Math.round(Number(amount) * 100);

let loading: Promise<void> | null = null;

export function loadPaystack(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).PaystackPop) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = INLINE_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { loading = null; reject(new Error("Failed to load Paystack")); };
    document.head.appendChild(script);
  });
  return loading;
}

// Opens the Paystack checkout popup; resolves with the transaction reference once the donor has paid.
export async function openPaystackPopup(params: PaystackChargeParams): Promise<PaystackChargeResult> {
  await loadPaystack();
  const PaystackPop = (window as any).PaystackPop;
  return new Promise<PaystackChargeResult>((resolve, reject) => {
    // Paystack validates the *presence* of keys: an explicit `channels: undefined` fails as "Invalid transaction parameters".
    const tx: Record<string, unknown> = {
      key: params.key,
      email: params.email,
      amount: toSubunits(params.amount),
      currency: params.currency.toUpperCase(),
      onSuccess: (t: any) => resolve({ reference: t?.reference || t?.trxref || "", status: t?.status }),
      onCancel: () => reject(new Error("cancelled")),
      onError: (e: any) => reject(new Error(e?.message || "Payment failed"))
    };
    if (params.channels?.length) tx.channels = params.channels;
    if (params.metadata) tx.metadata = params.metadata;
    try {
      new PaystackPop().newTransaction(tx);
    } catch (e: any) {
      reject(new Error(e?.message || "Payment failed"));
    }
  });
}
