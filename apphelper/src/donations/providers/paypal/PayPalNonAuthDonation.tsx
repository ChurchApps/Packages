"use client";

import React, { useState, useEffect } from "react";
import { ApiHelper } from "@churchapps/helpers";
import { PayPalNonAuthDonationInner } from "./PayPalNonAuthDonationInner";
import { DonationHelper } from "../../helpers";
import type { PaperProps } from "@mui/material/Paper";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
}

export const PayPalNonAuthDonation: React.FC<Props> = ({ mainContainerCssProps, showHeader, ...props }) => {
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

  const init = () => {
    ApiHelper.get("/gateways/churchId/" + props.churchId, "GivingApi").then((data: any) => {
      const paypalGateway = DonationHelper.findGatewayByProvider(data, "paypal");
      if (paypalGateway?.publicKey) {
        setPaypalClientId(paypalGateway.publicKey);
      }
    });
  };

  useEffect(init, []);

  return (
    <PayPalNonAuthDonationInner
      churchId={props.churchId}
      mainContainerCssProps={mainContainerCssProps}
      showHeader={showHeader}
      recaptchaSiteKey={props.recaptchaSiteKey}
      churchLogo={props?.churchLogo}
      paypalClientId={paypalClientId}
    />
  );
};
