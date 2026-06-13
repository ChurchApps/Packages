"use client";

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Locale } from "../helpers";

export interface KingdomFundingTokenResult {
  nonce: string;
  last4: string;
  cardType: string;
  expiryMonth: string;
  expiryYear: string;
  maskedCard: string;
}

export interface KingdomFundingTokenFormHandle {
  getNonce: () => Promise<KingdomFundingTokenResult>;
}

interface Props {
  tokenizationKey: string;
  sandbox?: boolean;
}

// CSS strings for each CardFormStyles field to match MUI outlined TextField
// accept.blue labelType options: "floating" | "static-left" | "static-top" | "hidden"
const inputBase = "font-family: 'Roboto','Helvetica','Arial',sans-serif; font-size: 1rem; color: rgba(0,0,0,0.87); border: 1px solid rgba(0,0,0,0.23); border-radius: 4px; padding: 16.5px 14px; background: #fff; outline: none; box-sizing: border-box; transition: border-color 200ms cubic-bezier(0.0,0,0.2,1);";
const tokenFormStyles = {
  container: "display: flex; flex-wrap: wrap; gap: 12px; width: 100%; align-items: flex-end;",
  card: inputBase + " flex: 1 0 100%; width: 100%;",
  expiryContainer: "display: flex; align-items: flex-end; gap: 4px;",
  expiryMonth: inputBase + " width: 64px; text-align: center;",
  expirySeparator: "font-size: 1.25rem; color: rgba(0,0,0,0.4); padding: 16.5px 0; line-height: 1;",
  expiryYear: inputBase + " width: 64px; text-align: center;",
  cvv2: inputBase + " width: 90px;",
  labels: "font-family: 'Roboto','Helvetica','Arial',sans-serif; font-size: 0.75rem; color: rgba(0,0,0,0.6);",
  labelType: "floating" as const
};

export const KingdomFundingTokenForm = forwardRef<KingdomFundingTokenFormHandle, Props>(
  ({ tokenizationKey, sandbox = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const hostedTokenizationRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const initCalledRef = useRef(false);

    const destroyTokenization = useCallback(() => {
      if (hostedTokenizationRef.current) {
        try {
          // destroy() returns a Promise that often rejects with undefined when the
          // iframe was never fully initialized (e.g. unmount during loading).
          // Swallow both sync throws and the async rejection so it doesn't surface
          // as an Unhandled Promise Rejection in the console.
          const result = hostedTokenizationRef.current.destroy();
          if (result && typeof result.catch === "function") {
            result.catch(() => { /* ignore */ });
          }
        } catch (_e) { /* ignore */ }
        hostedTokenizationRef.current = null;
      }
      // Clear any leftover iframes in the container
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    }, []);

    const initTokenization = useCallback(() => {
      if (initCalledRef.current) return;

      try {
        const HostedTokenization = (window as any).HostedTokenization;
        if (!HostedTokenization) {
          setError(Locale.label("donation.kingdomFunding.paymentFormNotAvailable"));
          setLoading(false);
          return;
        }

        // Clean up any previous instance first
        destroyTokenization();

        const containerId = "kf-token-container";
        if (containerRef.current) {
          containerRef.current.id = containerId;
        }

        initCalledRef.current = true;
        hostedTokenizationRef.current = new HostedTokenization(tokenizationKey, {
          target: `#${containerId}`,
          styles: tokenFormStyles
        });

        setLoading(false);
      } catch (_e) {
        setError(Locale.label("donation.kingdomFunding.failedToInitPaymentForm"));
        setLoading(false);
      }
    }, [tokenizationKey, destroyTokenization]);

    useEffect(() => {
      initCalledRef.current = false;

      if (!tokenizationKey) {
        setError(Locale.label("donation.kingdomFunding.missingTokenizationKey"));
        setLoading(false);
        return;
      }

      const scriptUrl = sandbox
        ? "https://tokenization.sandbox.accept.blue/tokenization/v0.3"
        : "https://tokenization.accept.blue/tokenization/v0.3";

      // Check if script already loaded
      if ((window as any).HostedTokenization) {
        initTokenization();
        return () => { destroyTokenization(); initCalledRef.current = false; };
      }

      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existingScript) {
        const onLoad = () => { initTokenization(); };
        if ((window as any).HostedTokenization) {
          initTokenization();
        } else {
          existingScript.addEventListener("load", onLoad);
        }
        return () => {
          existingScript.removeEventListener("load", onLoad);
          destroyTokenization();
          initCalledRef.current = false;
        };
      }

      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => { initTokenization(); };
      script.onerror = () => {
        setError(Locale.label("donation.kingdomFunding.failedToLoadPaymentForm"));
        setLoading(false);
      };
      document.head.appendChild(script);

      return () => {
        destroyTokenization();
        initCalledRef.current = false;
      };
    }, [tokenizationKey, sandbox, initTokenization, destroyTokenization]);

    useImperativeHandle(ref, () => ({
      getNonce: async (): Promise<KingdomFundingTokenResult> => {
        if (!hostedTokenizationRef.current) {
          throw new Error(Locale.label("donation.kingdomFunding.paymentFormNotInitialized"));
        }

        const result = await hostedTokenizationRef.current.getNonceToken();
        if (!result?.nonce) {
          throw new Error(result?.error || Locale.label("donation.kingdomFunding.failedToTokenizeCard"));
        }

        // Normalize expiry year to 4-digit (accept.blue API requires 2020-9999)
        let expYear = result.expiryYear ? Number(result.expiryYear) : 0;
        if (expYear > 0 && expYear < 100) expYear += 2000;

        return {
          nonce: result.nonce,
          last4: result.last4 || "",
          cardType: result.cardType || "",
          expiryMonth: result.expiryMonth ? String(result.expiryMonth) : "",
          expiryYear: expYear ? String(expYear) : "",
          maskedCard: result.maskedCard || ""
        };
      }
    }));

    if (error) {
      return <Typography color="error" sx={{ py: 2 }}>{error}</Typography>;
    }

    return (
      <Box>
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">{Locale.label("donation.kingdomFunding.loadingPaymentForm")}</Typography>
          </Box>
        )}
        <div ref={containerRef} style={{ minHeight: loading ? 0 : undefined }} />
      </Box>
    );
  }
);

KingdomFundingTokenForm.displayName = "KingdomFundingTokenForm";
