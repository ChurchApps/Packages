"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";

declare global {
  interface Window { paypal?: any }
}

export interface PayPalHostedFieldsHandle {
  submit: () => Promise<any>;
  isReady: boolean;
}

interface Props {
  clientId: string;
  createOrder: () => Promise<string>;
  getClientToken?: () => Promise<string>;
  onValidityChange?: (valid: boolean) => void;
  onIneligible?: (reason: string) => void;
}

function loadPayPalSdk(clientId: string, clientToken?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("Window not available")); return; }
    if (window.paypal && window.paypal.HostedFields) { resolve(window.paypal); return; }

    // Avoid adding script multiple times
    const existing = document.querySelector<HTMLScriptElement>('script[data-apphelper-paypal-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.paypal));
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=hosted-fields&intent=capture&commit=true`;
    script.async = true;
    script.dataset.apphelperPaypalSdk = "true";
    if (clientToken) (script as any).dataset.clientToken = clientToken;
    script.addEventListener("load", () => resolve(window.paypal));
    script.addEventListener("error", (e) => reject(e));
    document.body.appendChild(script);
  });
}

export const PayPalHostedFields = forwardRef<PayPalHostedFieldsHandle, Props>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostedFieldsRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useImperativeHandle(ref, () => ({
    submit: async () => {
      if (!hostedFieldsRef.current) throw new Error("Hosted Fields not ready");
      const result = await hostedFieldsRef.current.submit({ contingencies: ["3D_SECURE"] });
      return result;
    },
    isReady
  }), [isReady]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Require HTTPS (allow localhost for development). Hosted Fields won't function over plain HTTP.
        if (typeof window !== "undefined") {
          const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
          if (!isHttps) {
            props.onIneligible?.("PayPal HostedFields requires HTTPS");
            return;
          }
        }

        let clientToken: string | undefined;
        if (props.getClientToken) {
          try { clientToken = await props.getClientToken(); } catch { /* ignore */ }
        }

        const paypal = await loadPayPalSdk(props.clientId, clientToken);
        if (cancelled) return;
        if (!paypal || !paypal.HostedFields) {
          throw new Error("PayPal HostedFields unavailable");
        }

        if (!paypal.HostedFields.isEligible()) {
          props.onIneligible?.("PayPal HostedFields not eligible (missing client token or merchant not enabled)");
          // Do not throw to allow parent to render a fallback
          return;
        }

        const hf = await paypal.HostedFields.render({
          createOrder: async () => {
            const orderId = await props.createOrder();
            return orderId;
          },
          styles: {
            "input": { "font-size": "16px" },
            ":focus": { "color": "black" },
            ".invalid": { "color": "red" },
            ".valid": { "color": "green" }
          },
          fields: {
            number: { selector: "#pp-hf-number", placeholder: "4111 1111 1111 1111" },
            cvv: { selector: "#pp-hf-cvv", placeholder: "123" },
            expirationDate: { selector: "#pp-hf-expiry", placeholder: "MM/YY" }
          }
        });

        hostedFieldsRef.current = hf;
        setIsReady(true);

        hf.on("validityChange", (event: any) => {
          const allValid = Object.values(event.fields || {}).every((f: any) => f.isValid);
          setIsValid(allValid);
          props.onValidityChange?.(allValid);
        });
      } catch (e: any) {
        console.error("Failed to initialize PayPal Hosted Fields:", e);
        setIsReady(false);
        props.onValidityChange?.(false);
        props.onIneligible?.(e?.message || "Initialization failed");
      }
    })();
    return () => { cancelled = true; };
  }, [props.clientId]);

  return (
    <div ref={containerRef}>
      <div style={{ padding: 10, border: "1px solid #CCC", borderRadius: 5, backgroundColor: "white" }}>
        <label htmlFor="pp-hf-number" style={{ display: "block", fontWeight: 600 }}>Card Number</label>
        <div id="pp-hf-number" style={{ padding: 8, border: "1px solid #eee", borderRadius: 4, marginBottom: 8 }}></div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="pp-hf-expiry" style={{ display: "block", fontWeight: 600 }}>Expiry</label>
            <div id="pp-hf-expiry" style={{ padding: 8, border: "1px solid #eee", borderRadius: 4 }}></div>
          </div>
          <div style={{ width: 120 }}>
            <label htmlFor="pp-hf-cvv" style={{ display: "block", fontWeight: 600 }}>CVV</label>
            <div id="pp-hf-cvv" style={{ padding: 8, border: "1px solid #eee", borderRadius: 4 }}></div>
          </div>
        </div>
      </div>
      {!isReady && <div style={{ marginTop: 8, color: "#666" }}>Loading PayPal secure card fields…</div>}
      {isReady && !isValid && <div style={{ marginTop: 8, color: "#666" }}>Enter full card details to continue.</div>}
    </div>
  );
});

export default PayPalHostedFields;
