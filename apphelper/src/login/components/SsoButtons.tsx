"use client";

import React from "react";
import { Button, Divider } from "@mui/material";
import { ApiHelper } from "@churchapps/helpers";
import { Locale } from "../helpers";

type SsoProvider = "google" | "microsoft";

// Module-level cache so the Login and Register placements share a single request.
let providersCache: Promise<SsoProvider[]> | null = null;

const fetchProviders = (): Promise<SsoProvider[]> => {
  if (!providersCache) {
    providersCache = ApiHelper.getAnonymous("/users/sso/providers", "MembershipApi")
      .then((resp: any) => (Array.isArray(resp) ? resp : []))
      .catch(() => []);
  }
  return providersCache;
};

const googleIcon = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const microsoftIcon = (
  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

const providerMeta: Record<SsoProvider, { label: string; icon: React.ReactNode }> = {
  google: { label: "login.continueGoogle", icon: googleIcon },
  microsoft: { label: "login.continueMicrosoft", icon: microsoftIcon }
};

export const SsoButtons: React.FC = () => {
  const [providers, setProviders] = React.useState<SsoProvider[]>([]);

  React.useEffect(() => {
    let active = true;
    fetchProviders().then(p => { if (active) setProviders(p.filter(provider => providerMeta[provider])); });
    return () => { active = false; };
  }, []);

  if (providers.length === 0) return null;

  const startSso = (provider: SsoProvider) => {
    const base = ApiHelper.getConfig("MembershipApi")?.url;
    if (!base) return;
    window.location.href = `${base}/users/sso/authorize/${provider}?returnUrl=${encodeURIComponent(window.location.href)}`;
  };

  return (
    <>
      <Divider sx={{ color: "#6b7280", fontSize: "14px", "&::before, &::after": { borderColor: "#e5e7eb" } }}>
        {Locale.label("login.or")}
      </Divider>
      {providers.map(provider => (
        <Button
          key={provider}
          type="button"
          variant="outlined"
          fullWidth
          startIcon={providerMeta[provider].icon}
          onClick={() => startSso(provider)}
          sx={{
            backgroundColor: "white",
            color: "#374151",
            borderColor: "#d1d5db",
            padding: "12px",
            textTransform: "none",
            fontSize: "16px",
            fontWeight: 500,
            borderRadius: "6px",
            "&:hover": { backgroundColor: "#f9fafb", borderColor: "#d1d5db" }
          }}
        >
          {Locale.label(providerMeta[provider].label)}
        </Button>
      ))}
    </>
  );
};
