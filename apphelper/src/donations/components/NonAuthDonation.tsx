"use client";

import React, { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { ApiHelper } from "@churchapps/helpers";
import { NonAuthDonationInner } from "./NonAuthDonationInner";
import { PayPalNonAuthDonationInner } from "./PayPalNonAuthDonationInner";
import { DonationHelper } from "../helpers";
import { FormControl, InputLabel, Select, MenuItem, Box, Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";
import type { PaperProps } from "@mui/material/Paper";

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
        const defaultGateway = DonationHelper.findGatewayByProvider(enabledGateways, "stripe") || enabledGateways[0];
        setSelectedGateway(DonationHelper.normalizeProvider(defaultGateway?.provider));

        const stripeGateway = DonationHelper.findGatewayByProvider(enabledGateways, "stripe");
        if (stripeGateway?.publicKey) {
          setStripe(loadStripe(stripeGateway.publicKey));
        }
      }

      setLoading(false);
    });
  };

  const handleGatewayChange = (event: any) => {
    setSelectedGateway(event.target.value);
  };

  useEffect(init, []); //eslint-disable-line

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading payment options...</Typography></Box>;
  }

  if (availableGateways.length === 0) {
    return <Box sx={{ p: 3 }}><Typography>No payment gateways available for this church.</Typography></Box>;
  }

  const renderGatewaySelector = () => {
    if (availableGateways.length <= 1) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Payment Method</InputLabel>
          <Select
            value={selectedGateway}
            label="Payment Method"
            onChange={handleGatewayChange}
          >
            {availableGateways.map((gateway: any) => (
              <MenuItem key={gateway.id} value={DonationHelper.normalizeProvider(gateway.provider)}>
                {DonationHelper.isProvider(gateway.provider, "stripe") ? "Credit Card (Stripe)" : "Credit Card (PayPal)"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  const renderPaymentTypeSelector = () => {
    // Only show if Stripe is available (ACH requires Stripe)
    // Only show ACH if the currency is USD
    const stripeGateway = DonationHelper.findGatewayByProvider(availableGateways, "stripe");
    const currency = stripeGateway?.currency || "usd";
    if (!stripeGateway || selectedGateway !== "stripe") return null;

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
  };

  const renderDonationForm = () => {
    if (selectedGateway === "paypal") {
      const paypalGateway = DonationHelper.findGatewayByProvider(availableGateways, "paypal");
      return (
        <PayPalNonAuthDonationInner
          churchId={props.churchId}
          mainContainerCssProps={mainContainerCssProps}
          showHeader={false} // We'll show our own header with gateway selector
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
    } else {
      return (
        <Elements stripe={stripePromise}>
          <NonAuthDonationInner
            churchId={props.churchId}
            mainContainerCssProps={mainContainerCssProps}
            showHeader={false} // We'll show our own header with gateway selector
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
    }
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
      {renderGatewaySelector()}
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