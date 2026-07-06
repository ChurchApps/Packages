"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { Alert } from "@mui/material";
import { ApiHelper, QuestionInterface } from "@churchapps/helpers";
import type { PaymentGateway } from "../helpers";
import { getPaymentProvider, hasPaymentProvider, pickDefaultGateway } from "../providers";
import type { FormPaymentHandle } from "../providers";

interface Props {
  churchId: string;
  question: QuestionInterface;
}

// Resolves the church's gateway and renders that provider's form-payment widget.
export const FormPaymentQuestion = forwardRef<FormPaymentHandle, Props>((props, ref) => {
  const [gateway, setGateway] = useState<PaymentGateway | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    ApiHelper.get(`/donate/gateways/${props.churchId}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const supported = gateways.filter((g: PaymentGateway) => hasPaymentProvider(g.provider) && !!getPaymentProvider(g.provider).FormPayment);
      setGateway(pickDefaultGateway(supported));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [props.churchId]);

  if (!loaded) return null;
  if (!gateway) return <Alert severity="warning">Online payment is not available for this church.</Alert>;

  const FormPayment = getPaymentProvider(gateway.provider).FormPayment!;
  return <FormPayment ref={ref} churchId={props.churchId} question={props.question} gateway={gateway} />;
});
FormPaymentQuestion.displayName = "FormPaymentQuestion";
