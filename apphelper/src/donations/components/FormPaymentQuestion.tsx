"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { Alert } from "@mui/material";
import { ApiHelper, QuestionInterface } from "@churchapps/helpers";
import type { PaymentGateway } from "../helpers";
import { getPaymentProvider, hasPaymentProvider, pickDefaultGateway } from "../providers";
import type { FormPaymentHandle, PaymentProvider } from "../providers";
import { ProviderFormPayment } from "../providers/ProviderFormPayment";

interface Props {
  churchId: string;
  question: QuestionInterface;
}

// A provider can take form payments with its own FormPayment widget, or generically through its MemberEntry.
const canTakeFormPayment = (provider: PaymentProvider) => !!provider.FormPayment || !!provider.MemberEntry;

// Resolves the church's gateway and renders that provider's form-payment widget.
export const FormPaymentQuestion = forwardRef<FormPaymentHandle, Props>((props, ref) => {
  const [gateway, setGateway] = useState<PaymentGateway | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    ApiHelper.getAnonymous(`/donate/gateways/${props.churchId}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const supported = gateways.filter((g: PaymentGateway) => hasPaymentProvider(g.provider) && canTakeFormPayment(getPaymentProvider(g.provider)));
      setGateway(pickDefaultGateway(supported));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [props.churchId]);

  if (!loaded) return null;
  if (!gateway) return <Alert severity="warning">Online payment is not available for this church.</Alert>;

  const provider = getPaymentProvider(gateway.provider);
  if (provider.FormPayment) {
    const FormPayment = provider.FormPayment;
    return <FormPayment ref={ref} churchId={props.churchId} question={props.question} gateway={gateway} />;
  }
  return <ProviderFormPayment ref={ref} churchId={props.churchId} question={props.question} gateway={gateway} provider={provider} />;
});
FormPaymentQuestion.displayName = "FormPaymentQuestion";
