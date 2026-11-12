"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Box, Grid, TextField } from "@mui/material";
import { ApiHelper, CurrencyHelper, UserHelper } from "@churchapps/helpers";
import type { ChurchInterface } from "@churchapps/helpers";
import { Locale } from "../helpers";
import { GuestCaptcha } from "../helpers/GuestCaptcha";
import type { ChargeContext, FormPaymentHandle, FormPaymentProps, MemberEntryHandle, PaymentProvider } from "./types";

interface Props extends FormPaymentProps {
  provider: PaymentProvider;
}

const OK_STATUSES = ["succeeded", "pending", "active", "processing", "Approved", "APPROVED", "COMPLETED"];

// Form "Payment" question for any provider with a MemberEntry: the provider's own card entry,
// charged once through its buildChargeRequest. Stripe keeps its dedicated FormCardPayment.
export const ProviderFormPayment = forwardRef<FormPaymentHandle, Props>((props, ref) => {
  const { provider, gateway } = props;
  const entryRef = useRef<MemberEntryHandle>(null);
  const isAuthed = ApiHelper.isAuthenticated;
  const [email, setEmail] = useState<string>((isAuthed && UserHelper.user?.email) || "");
  const [firstName, setFirstName] = useState<string>((isAuthed && UserHelper.user?.firstName) || "");
  const [lastName, setLastName] = useState<string>((isAuthed && UserHelper.user?.lastName) || "");
  const [church, setChurch] = useState<ChurchInterface>();
  const amount = Number(props.question.choices?.find(c => c.text === "Amount")?.value || 0);
  const fundId = props.question.choices?.find(c => c.text === "FundId")?.value || "";
  const currency = (gateway?.currency || "usd").toLowerCase();

  // Guests must pass the captcha; the Api refuses guest charges without its pass.
  const isGuest = !isAuthed;
  const bypassRecaptcha = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BYPASS_RECAPTCHA === "true";
  const recaptchaSiteKey = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY) || "";
  const [captchaResponse, setCaptchaResponse] = useState(bypassRecaptcha ? "success" : "");
  const captchaRef = useRef<ReCAPTCHA>(null);
  const captchaPass = useRef("");
  const person = useRef<{ id: string; email: string; name: string }>({ id: "", email: "", name: "" });

  // Read live by the provider entry (e.g. PayPal creates its order from it), so it is built from refs/state at call time.
  const contextRef = useRef<() => ChargeContext>(() => ({} as ChargeContext));
  contextRef.current = () => ({
    provider: provider.key,
    gatewayId: gateway?.id,
    churchId: props.churchId,
    amount,
    funds: [{ id: fundId, amount }],
    person: person.current.email ? person.current : { id: "", email, name: `${firstName} ${lastName}`.trim() },
    notes: "",
    church: {
      name: church?.name || "",
      subDomain: church?.subDomain || "",
      churchURL: typeof window !== "undefined" ? window.location.origin : "",
      logo: ""
    },
    recurring: false,
    saveCard: false,
    captchaPass: captchaPass.current,
    currency
  });
  const getContext = () => contextRef.current();

  useEffect(() => {
    ApiHelper.get("/churches/lookup/?id=" + props.churchId, "MembershipApi").then((data: any) => setChurch(data)).catch(() => { /* church name is cosmetic on receipts */ });
  }, [props.churchId]);

  const handleCaptchaChange = (value: string | null) => {
    if (!value) { captchaPass.current = ""; setCaptchaResponse(""); return; }
    GuestCaptcha.verify(value, props.churchId)
      .then((result) => { captchaPass.current = result.pass; setCaptchaResponse(result.status); })
      .catch(() => { captchaPass.current = ""; setCaptchaResponse("error"); });
  };

  // A failed payment needs a fresh check, so the retry carries a new pass.
  const resetCaptcha = () => {
    captchaPass.current = "";
    captchaRef.current?.reset();
    setCaptchaResponse(bypassRecaptcha ? "success" : "");
  };

  const validate = () => {
    const result: string[] = [];
    if (!firstName) result.push(Locale.label("donation.donationForm.validate.firstName"));
    if (!lastName) result.push(Locale.label("donation.donationForm.validate.lastName"));
    if (!email) result.push(Locale.label("donation.donationForm.validate.email"));
    if (result.length === 0 && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) result.push(Locale.label("donation.donationForm.validate.validEmail"));
    if (result.length === 0 && isGuest && captchaResponse !== "success") result.push("Please complete the reCAPTCHA verification");
    if (result.length === 0 && (!amount || amount <= 0)) result.push(Locale.label("donation.donationForm.validate.amount"));
    return result;
  };

  const fail = (errors: string[]) => {
    if (isGuest) resetCaptcha();
    return { paymentSuccessful: false, name: "", errors };
  };

  const handlePayment = async () => {
    const errors = validate();
    if (errors.length > 0) return { paymentSuccessful: false, name: "", errors };
    if (!entryRef.current) return { paymentSuccessful: false, name: "", errors: ["Payment processing unavailable"] };

    let personRecord: any;
    try {
      await ApiHelper.post("/users/loadOrCreate", { userEmail: email, firstName, lastName }, "MembershipApi");
      personRecord = await ApiHelper.post("/people/loadOrCreate", { churchId: props.churchId, firstName, lastName, email }, "MembershipApi");
    } catch {
      return fail(["An error occurred while processing your payment."]);
    }
    const name = personRecord?.name?.display || `${firstName} ${lastName}`.trim();
    person.current = { id: personRecord?.id || "", email: personRecord?.contactInfo?.email || email, name };

    let token;
    try {
      token = await entryRef.current.tokenize();
    } catch (e: any) {
      const msg = e?.message === "cancelled" ? Locale.label("donation.paystack.paymentFailed") : (e?.message || "An error occurred while processing your payment method.");
      return fail([msg]);
    }
    if (!token?.id) return fail([Locale.label("donation.paystack.paymentFailed")]);

    const { endpoint, body } = provider.buildChargeRequest(getContext(), token);
    let results: any;
    try {
      results = await ApiHelper.post(endpoint, GuestCaptcha.withPass(body, captchaPass.current), "GivingApi");
    } catch (e: any) {
      return fail([e?.message || "An error occurred while saving your payment."]);
    }

    if (provider.finalizeResult) {
      try {
        const fin = await provider.finalizeResult(results);
        if (fin.requiresAction) return fin.success ? { paymentSuccessful: true, name, errors: [] as string[] } : fail([fin.error || "Payment was not successful."]);
        results = fin.result;
      } catch (e: any) {
        return fail([e?.message || "Payment was not successful."]);
      }
    }

    if (results?.status && OK_STATUSES.includes(results.status)) return { paymentSuccessful: true, name, errors: [] as string[] };
    return fail([results?.raw?.message || results?.error || results?.message || "Payment was not successful."]);
  };

  useImperativeHandle(ref, () => ({ handlePayment, questionId: props.question.id }));

  const Entry = provider.MemberEntry!;
  const Wrapper = provider.MemberWrapper;
  const entry = <Entry ref={entryRef} gateway={gateway} getContext={getContext} />;
  const fieldProps = { fullWidth: true, required: true, size: "small" as const, margin: "none" as const, style: { backgroundColor: "white", borderRadius: "4px" }, InputLabelProps: { sx: { fontWeight: "bold" } } };

  return <div style={{ backgroundColor: "#bdbdbd", padding: 35, borderRadius: 20 }} data-testid="form-payment">
    <Grid container spacing={2}>
      <Grid size={12}>
        <TextField {...fieldProps} label={Locale.label("person.email")} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isAuthed && (UserHelper.user?.email || "") !== ""} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField {...fieldProps} label={Locale.label("person.firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isAuthed && (UserHelper.user?.firstName || "") !== ""} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField {...fieldProps} label={Locale.label("person.lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isAuthed && (UserHelper.user?.lastName || "") !== ""} />
      </Grid>
      <Grid size={12}>
        <Box sx={{ backgroundColor: "white", padding: 1.5, borderRadius: 1, color: "gray", fontWeight: "bold", fontSize: 18 }}>{CurrencyHelper.getCurrencySymbol(currency)} {amount}</Box>
      </Grid>
      {isGuest && !bypassRecaptcha && (
        <Grid size={12}>
          <ReCAPTCHA sitekey={recaptchaSiteKey} ref={captchaRef} onChange={handleCaptchaChange} onExpired={() => { captchaPass.current = ""; setCaptchaResponse(""); }} onErrored={() => setCaptchaResponse("error")} />
        </Grid>
      )}
      <Grid size={12}>
        <Box sx={{ backgroundColor: "white", padding: 1.5, borderRadius: 1 }}>
          {Wrapper ? <Wrapper gateway={gateway}>{entry}</Wrapper> : entry}
        </Box>
      </Grid>
    </Grid>
  </div>;
});
ProviderFormPayment.displayName = "ProviderFormPayment";
