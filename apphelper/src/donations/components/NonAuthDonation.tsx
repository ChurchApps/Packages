"use client";

import React, { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { ApiHelper } from "@churchapps/helpers";
import { NonAuthDonationInner } from "./NonAuthDonationInner";
import { PayPalNonAuthDonationInner } from "./PayPalNonAuthDonationInner";
import { KingdomFundingNonAuthDonationInner } from "./KingdomFundingNonAuthDonationInner";
import { DonationHelper } from "../helpers";
import { Box, Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";
import type { PaperProps } from "@mui/material/Paper";

// Kingdom Funding ACH is hidden in the UI pending hosted ACH tokenization support
// from the gateway. Flip to true once tokenization no longer requires raw routing/
// account numbers to flow through our backend.
const KF_ACH_ENABLED = false;

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
  allowSingleGift?: boolean;
  allowRecurring?: boolean;
  showFundSelector?: boolean;
  allowedFundIds?: string[];
  defaultFundId?: string;
}

export const NonAuthDonation: React.FC<Props> = ({ mainContainerCssProps, showHeader, ...props }) => {
  const [stripePromise, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [availableGateways, setAvailableGateways] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("stripe");
  const [paymentType, setPaymentType] = useState<"card" | "bank">("card");
  const [loading, setLoading] = useState(true);

  const init = () => {
    ApiHelper.get(`/donate/gateways/${props.churchId}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const enabledGateways = gateways.filter((gateway: any) => gateway && gateway.enabled !== false);
      setAvailableGateways(enabledGateways);

      if (enabledGateways.length > 0) {
        const stripeGateway = DonationHelper.findGatewayByProvider(enabledGateways, "stripe");
        const kfGateway = DonationHelper.findGatewayByProvider(enabledGateways, "kingdomfunding");
        const defaultGateway = stripeGateway || kfGateway || enabledGateways[0];
        setSelectedGateway(DonationHelper.normalizeProvider(defaultGateway?.provider));

        if (stripeGateway?.publicKey) {
          setStripe(loadStripe(stripeGateway.publicKey));
        }
      }

      setLoading(false);
    });
  };

  useEffect(init, []);

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading payment options...</Typography></Box>;
  }

  if (availableGateways.length === 0) {
    return <Box sx={{ p: 3 }}><Typography>No payment gateways available for this church.</Typography></Box>;
  }

  // ponytail: the payment processor is a church setting, never a donor choice —
  // we always use the church's configured gateway (`selectedGateway`) and never
  // surface a processor picker. Stripe and Kingdom Funding look identical here.
  const renderPaymentTypeSelector = () => {
    // PayPal: no card/bank toggle
    if (selectedGateway === "paypal") return null;

    // Kingdom Funding: card/bank toggle is hidden while KF_ACH_ENABLED is false
    if (selectedGateway === "kingdomfunding" && !KF_ACH_ENABLED) return null;

    // Stripe: show card/bank toggle only if Stripe gateway present and currency USD
    if (selectedGateway === "stripe") {
      const stripeGateway = DonationHelper.findGatewayByProvider(availableGateways, "stripe");
      const currency = stripeGateway?.currency || "usd";
      if (!stripeGateway) return null;
      return (
        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={paymentType}
            exclusive
            onChange={(_, value) => value && setPaymentType(value)}
            fullWidth
            size="small"
            sx={{ backgroundColor: "#FFFFFF", borderRadius: 1 }}
          >
            <ToggleButton value="card" sx={{ backgroundColor: "#FFFFFF", color: "#333", "&.Mui-selected": { backgroundColor: "#1976d2", color: "#FFFFFF" }, "&:hover": { backgroundColor: "#f5f5f5" }, "&.Mui-selected:hover": { backgroundColor: "#1565c0" } }}>Credit/Debit Card</ToggleButton>
            {currency === "usd" && <ToggleButton value="bank" sx={{ backgroundColor: "#FFFFFF", color: "#333", "&.Mui-selected": { backgroundColor: "#1976d2", color: "#FFFFFF" }, "&:hover": { backgroundColor: "#f5f5f5" }, "&.Mui-selected:hover": { backgroundColor: "#1565c0" } }}>Bank Account (ACH)</ToggleButton>}
          </ToggleButtonGroup>
        </Box>
      );
    }

    return null;
  };

  const renderDonationForm = () => {
    if (selectedGateway === "kingdomfunding") {
      return (
        <KingdomFundingNonAuthDonationInner
          churchId={props.churchId}
          mainContainerCssProps={mainContainerCssProps}
          showHeader={false}
          recaptchaSiteKey={props.recaptchaSiteKey}
          churchLogo={props?.churchLogo}
          // ACH disabled — always pass "card". KF inner also enforces this via its own KF_ACH_ENABLED gate.
          paymentType="card"
        />
      );
    }

    if (selectedGateway === "paypal") {
      const paypalGateway = DonationHelper.findGatewayByProvider(availableGateways, "paypal");
      return (
        <PayPalNonAuthDonationInner
          churchId={props.churchId}
          mainContainerCssProps={mainContainerCssProps}
          showHeader={false}
          recaptchaSiteKey={props.recaptchaSiteKey}
          churchLogo={props?.churchLogo}
          paypalClientId={paypalGateway?.publicKey || null}
          allowSingleGift={props.allowSingleGift}
          allowRecurring={props.allowRecurring}
          showFundSelector={props.showFundSelector}
          allowedFundIds={props.allowedFundIds}
          defaultFundId={props.defaultFundId}
        />
      );
    }

    return (
      <Elements stripe={stripePromise}>
        <NonAuthDonationInner
          churchId={props.churchId}
          mainContainerCssProps={mainContainerCssProps}
          showHeader={false}
          recaptchaSiteKey={props.recaptchaSiteKey}
          churchLogo={props?.churchLogo}
          paymentType={paymentType}
          allowSingleGift={props.allowSingleGift}
          allowRecurring={props.allowRecurring}
          showFundSelector={props.showFundSelector}
          allowedFundIds={props.allowedFundIds}
          defaultFundId={props.defaultFundId}
        />
      </Elements>
    );
  };

  return (
    <Box>
      {showHeader && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Donate
          </Typography>
        </Box>
      )}
      {renderPaymentTypeSelector()}
      {renderDonationForm()}
      <Box sx={{ marginTop: "15px", fontSize: "14px" }}>
        <a href="/mobile/donate" style={{ color: "#1976d2" }}>
          Login to manage existing donations
        </a>
      </Box>
    </Box>
  );
};
