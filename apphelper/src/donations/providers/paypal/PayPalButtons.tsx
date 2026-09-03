"use client";

import { useEffect, useRef, useState } from "react";
import { loadPayPalSdk } from "./paypalSdk";

// createOrder must reject to stop the PayPal window, but the caller has already shown why.
const ABORTED = "paypal-order-aborted";

interface Props {
  clientId: string;
  getClientToken?: () => Promise<string>;
  createOrder: () => Promise<string>;
  onApprove: (orderId: string) => void | Promise<void>;
  onError?: (message: string) => void;
}

export const PayPalButtons: React.FC<Props> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: any;
    (async () => {
      try {
        const paypal = await loadPayPalSdk(props.clientId, props.getClientToken);
        if (cancelled || !paypal?.Buttons || !containerRef.current) return;
        instance = paypal.Buttons({
          style: { layout: "vertical", height: 45, tagline: false },
          createOrder: async () => {
            const orderId = await callbacks.current.createOrder();
            if (!orderId) throw new Error(ABORTED);
            return orderId;
          },
          onApprove: async (data: any) => { await callbacks.current.onApprove(data?.orderID || ""); },
          onError: (e: any) => { if (e?.message !== ABORTED) callbacks.current.onError?.(e?.message || "PayPal checkout failed"); }
        });
        if (instance.isEligible && !instance.isEligible()) return;
        await instance.render(containerRef.current);
        if (!cancelled) setRendered(true);
      } catch (e: any) {
        callbacks.current.onError?.(e?.message || "PayPal checkout unavailable");
      }
    })();
    return () => {
      cancelled = true;
      try { instance?.close?.(); } catch { /* already torn down */ }
    };
  }, [props.clientId]);

  return <div ref={containerRef} data-testid="paypal-buttons" style={{ marginBottom: rendered ? 12 : 0 }} />;
};

export default PayPalButtons;
