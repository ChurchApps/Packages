"use client";

import React, { useState, useEffect } from "react";
import { ApiHelper } from "@churchapps/helpers";
import type { PaymentGateway } from "../helpers";
import { getPaymentProvider, pickDefaultGateway } from "../providers";
import { Box, Typography } from "@mui/material";
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
  const [gateway, setGateway] = useState<PaymentGateway | null>(null);
  const [loading, setLoading] = useState(true);

  const init = () => {
    ApiHelper.get(`/donate/gateways/${props.churchId}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      setGateway(pickDefaultGateway(gateways));
      setLoading(false);
    });
  };

  useEffect(init, []);

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading payment options...</Typography></Box>;
  }

  if (!gateway) {
    return <Box sx={{ p: 3 }}><Typography>No payment gateways available for this church.</Typography></Box>;
  }

  const GuestForm = getPaymentProvider(gateway.provider).GuestForm;

  return (
    <Box>
      {showHeader && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Donate
          </Typography>
        </Box>
      )}
      <GuestForm
        churchId={props.churchId}
        gateway={gateway}
        recaptchaSiteKey={props.recaptchaSiteKey}
        mainContainerCssProps={mainContainerCssProps}
        showHeader={false}
        churchLogo={props?.churchLogo}
        allowSingleGift={props.allowSingleGift}
        allowRecurring={props.allowRecurring}
        showFundSelector={props.showFundSelector}
        allowedFundIds={props.allowedFundIds}
        defaultFundId={props.defaultFundId}
      />
      <Box sx={{ marginTop: "15px", fontSize: "14px" }}>
        <a href="/mobile/donate" style={{ color: "#1976d2" }}>
          Login to manage existing donations
        </a>
      </Box>
    </Box>
  );
};
