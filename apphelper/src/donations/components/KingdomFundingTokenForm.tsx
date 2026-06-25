"use client";

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Locale } from "../helpers";

export interface KingdomFundingTokenResult {
  nonce: string;
  token: string;
  paymentType: "card" | "ach";
  last4: string;
  cardType: string;
  expiryMonth: string;
  expiryYear: string;
  maskedCard: string;
  accountLast4?: string;
  accountName?: string;
}

export interface KingdomFundingTokenFormHandle {
  getNonce: () => Promise<KingdomFundingTokenResult>;
}

interface Props {
  tokenizationKey: string;
  paymentMethod?: "card" | "ach";
  sandbox?: boolean;
}

const COLLECT_JS_URL = "https://secure.nmi.com/token/Collect.js";

const customCss = {
  "font-family": "'Roboto','Helvetica','Arial',sans-serif",
  "font-size": "16px",
  color: "rgba(0,0,0,0.87)"
};
const invalidCss = { color: "#d32f2f" };
const focusCss = { color: "rgba(0,0,0,0.87)" };
const placeholderCss = { color: "rgba(0,0,0,0.5)" };

const fieldBoxSx = {
  border: "1px solid rgba(0,0,0,0.23)",
  borderRadius: "4px",
  padding: "0 14px",
  height: "56px",
  display: "flex",
  alignItems: "center",
  background: "#fff",
  "& iframe": { width: "100%", height: "100%", border: "none" }
};

export const KingdomFundingTokenForm = forwardRef<KingdomFundingTokenFormHandle, Props>(
  ({ tokenizationKey, paymentMethod = "card", sandbox: _sandbox = false }, ref) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const configuredRef = useRef(false);
    type PendingRequest = { resolve: (r: KingdomFundingTokenResult) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
    const pendingRef = useRef<PendingRequest | null>(null);

    const settlePending = useCallback((fn: "resolve" | "reject", value: any) => {
      const p = pendingRef.current;
      if (!p) return;
      clearTimeout(p.timer);
      pendingRef.current = null;
      if (fn === "resolve") p.resolve(value);
      else p.reject(value);
    }, []);

    const configureCollectJs = useCallback(() => {
      const CollectJS = (window as any).CollectJS;
      if (!CollectJS) {
        setError(Locale.label("donation.kingdomFunding.paymentFormNotAvailable"));
        setLoading(false);
        return;
      }

      const fields =
        paymentMethod === "ach"
          ? {
            checkaccount: { selector: "#kf-checkaccount", placeholder: "Account Number" },
            checkaba: { selector: "#kf-checkaba", placeholder: "Routing Number" },
            checkname: { selector: "#kf-checkname", placeholder: "Name on Account" }
          }
          : {
            ccnumber: { selector: "#kf-ccnumber", placeholder: "0000 0000 0000 0000" },
            ccexp: { selector: "#kf-ccexp", placeholder: "MM / YY" },
            cvv: { selector: "#kf-cvv", placeholder: "CVV" }
          };

      try {
        CollectJS.configure({
          variant: "inline",
          tokenizationKey,
          customCss,
          invalidCss,
          focusCss,
          placeholderCss,
          fields,
          fieldsAvailableCallback: () => setLoading(false),
          validationCallback: (_field: string, valid: boolean, message: string) => {
            if (!valid && pendingRef.current) {
              settlePending("reject", new Error(message || Locale.label("donation.kingdomFunding.failedToTokenizeCard")));
            }
          },
          timeoutCallback: () => {
            settlePending("reject", new Error(Locale.label("donation.kingdomFunding.failedToTokenizeCard")));
          },
          callback: (response: any) => {
            const card = response.card || {};
            const check = response.check || {};
            const exp: string = card.exp || "";
            const isAch = !!response.check && !response.card;
            settlePending("resolve", {
              nonce: response.token,
              token: response.token,
              paymentType: isAch ? "ach" : "card",
              last4: (card.number || "").replace(/[^0-9]/g, "").slice(-4),
              cardType: card.type || "",
              expiryMonth: exp ? exp.slice(0, 2) : "",
              expiryYear: exp ? "20" + exp.slice(2, 4) : "",
              maskedCard: card.number || "",
              accountLast4: (check.account || "").replace(/[^0-9]/g, "").slice(-4),
              accountName: check.name || ""
            } as KingdomFundingTokenResult);
          }
        });
        configuredRef.current = true;
      } catch {
        setError(Locale.label("donation.kingdomFunding.failedToInitPaymentForm"));
        setLoading(false);
      }
    }, [tokenizationKey, paymentMethod, settlePending]);

    useEffect(() => {
      if (!tokenizationKey) {
        setError(Locale.label("donation.kingdomFunding.missingTokenizationKey"));
        setLoading(false);
        return;
      }
      setError(null);
      setLoading(true);
      configuredRef.current = false;

      const onScriptReady = () => configureCollectJs();

      if ((window as any).CollectJS) {
        onScriptReady();
      } else {
        let script = document.querySelector<HTMLScriptElement>(`script[src="${COLLECT_JS_URL}"]`);
        if (!script) {
          script = document.createElement("script");
          script.src = COLLECT_JS_URL;
          script.async = true;
          script.setAttribute("data-tokenization-key", tokenizationKey);
          script.setAttribute("data-variant", "inline");
          script.onload = onScriptReady;
          script.onerror = () => {
            setError(Locale.label("donation.kingdomFunding.failedToLoadPaymentForm"));
            setLoading(false);
          };
          document.head.appendChild(script);
        } else {
          script.addEventListener("load", onScriptReady);
        }
      }

      return () => {
        if (pendingRef.current) {
          settlePending("reject", new Error(Locale.label("donation.kingdomFunding.paymentFormNotInitialized")));
        }
      };
    }, [tokenizationKey, paymentMethod, configureCollectJs, settlePending]);

    useImperativeHandle(ref, () => ({
      getNonce: (): Promise<KingdomFundingTokenResult> =>
        new Promise<KingdomFundingTokenResult>((resolve, reject) => {
          const CollectJS = (window as any).CollectJS;
          if (!CollectJS || !configuredRef.current) {
            reject(new Error(Locale.label("donation.kingdomFunding.paymentFormNotInitialized")));
            return;
          }
          const timer = setTimeout(() => {
            settlePending("reject", new Error(Locale.label("donation.kingdomFunding.failedToTokenizeCard")));
          }, 20000);
          pendingRef.current = { resolve, reject, timer };
          try {
            CollectJS.startPaymentRequest();
          } catch (e: any) {
            settlePending("reject", new Error(e?.message || Locale.label("donation.kingdomFunding.failedToTokenizeCard")));
          }
        })
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
        {paymentMethod === "ach" ? (
          <Box sx={{ display: loading ? "none" : "flex", flexDirection: "column", gap: 1.5 }}>
            <Box id="kf-checkname" sx={fieldBoxSx} />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Box id="kf-checkaba" sx={{ ...fieldBoxSx, flex: 1 }} />
              <Box id="kf-checkaccount" sx={{ ...fieldBoxSx, flex: 1 }} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: loading ? "none" : "flex", flexDirection: "column", gap: 1.5 }}>
            <Box id="kf-ccnumber" sx={fieldBoxSx} />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Box id="kf-ccexp" sx={{ ...fieldBoxSx, flex: 1 }} />
              <Box id="kf-cvv" sx={{ ...fieldBoxSx, flex: 1 }} />
            </Box>
          </Box>
        )}
      </Box>
    );
  }
);

KingdomFundingTokenForm.displayName = "KingdomFundingTokenForm";
