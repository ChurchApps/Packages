import React from "react";
import {
  Container,
  Box,
  Typography,
  Alert,
  Stack,
  Divider,
} from "@mui/material";
import { Link } from "react-router-dom";
import type { Stripe } from "@stripe/stripe-js";
import { ErrorBoundary } from "../ErrorBoundary";
import UserContext from "../UserContext";
import {
  NonAuthDonation,
  MultiGatewayDonationForm,
  PaymentMethods,
  RecurringDonations,
  StripePaymentMethod,
  PaymentGateway,
  PaymentMethod,
} from "../../../src/donations";
import { ApiHelper, CurrencyHelper } from "@churchapps/helpers";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

export default function AppHelperDonationsPage() {
  const context = React.useContext(UserContext);

  // Stripe for authenticated components (will be initialized after getting gateway info)
  const [stripePromise, setStripePromise] =
    React.useState<Promise<Stripe | null> | null>(null);

  // Live data state for authenticated donation features
  const [customerId, setCustomerId] = React.useState<string>("");
  const [stripePaymentMethods, setStripePaymentMethods] = React.useState<
    StripePaymentMethod[]
  >([]);
  const [paymentMethodsAll, setPaymentMethodsAll] = React.useState<
    PaymentMethod[]
  >([]);
  const [paymentGateways, setPaymentGateways] = React.useState<
    PaymentGateway[]
  >([]);
  const [loadingAuthData, setLoadingAuthData] = React.useState<boolean>(false);
  const [history, setHistory] = React.useState<any[] | null>(null);
  const [historyError, setHistoryError] = React.useState<string | null>(null);

  // Load authenticated data from staging APIs
  React.useEffect(() => {
    const loadAuthData = async () => {
      if (!context?.user || !context?.person) return;
      setLoadingAuthData(true);
      try {
        // Gateways for the selected church
        const gws: any[] = await ApiHelper.get("/gateways", "GivingApi");
        const pg: PaymentGateway[] = (gws || []).map((g: any) => ({
          id: g.id,
          provider: g.provider,
          publicKey: g.publicKey,
          enabled: g.enabled !== false,
          currency: g?.currency || "usd",
        }));
        setPaymentGateways(pg);

        // Initialize Stripe with the public key from gateway
        const stripeGateway = pg.find(
          (g) => g.provider?.toLowerCase() === "stripe",
        );
        if (stripeGateway?.publicKey) {
          setStripePromise(loadStripe(stripeGateway.publicKey));
        }

        // Load payment methods - API now returns normalized format
        try {
          const pms = await ApiHelper.get(
            `/paymentmethods/personid/${context.person.id}`,
            "GivingApi",
          );
          const stripePMs: StripePaymentMethod[] = [];
          const allPMs: PaymentMethod[] = [];

          if (Array.isArray(pms)) {
            for (const pm of pms) {
              if (pm.provider === "stripe") {
                stripePMs.push(new StripePaymentMethod(pm));
              }
              allPMs.push(pm);

              // Extract customer ID from first payment method if we don't have one
              if (pm.customerId && !customerId) {
                setCustomerId(pm.customerId);
              }
            }
          }

          setStripePaymentMethods(stripePMs);
          setPaymentMethodsAll(allPMs);
        } catch (e) {
          // As a fallback, leave methods empty; components will allow adding
          setStripePaymentMethods([]);
          setPaymentMethodsAll([]);
        }

        // Donation history (best-effort)
        try {
          const hist = await ApiHelper.get(
            `/donations?personId=${context.person.id}`,
            "GivingApi",
          );
          if (Array.isArray(hist)) setHistory(hist);
        } catch (e: any) {
          setHistoryError("Donation history unavailable");
        }
      } finally {
        setLoadingAuthData(false);
      }
    };
    loadAuthData();
  }, [context?.user, context?.person]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 2, mb: 2 }}>
        <Link to="/">← Back to Home</Link>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
          Donations
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Sandbox Payment Info
          </Typography>
          <Typography variant="body2">
            Use the following test card details on the staging/sandbox servers:
          </Typography>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>
              <strong>Stripe</strong>: Card <code>4242 4242 4242 4242</code>,
              any future expiry, any 3‑digit CVC, any ZIP.
            </li>
            <li>
              <strong>PayPal (Advanced Cards)</strong>: Visa{" "}
              <code>4111 1111 1111 1111</code> or Mastercard{" "}
              <code>5555 5555 5555 4444</code> or Amex{" "}
              <code>3782 822463 10005</code>, any future expiry, any valid CVV.
            </li>
          </ul>
        </Alert>

        <ErrorBoundary>
          {!context?.user ? (
            // Non-authenticated donation form as specified in PRD
            // JNZUfFMKiWI AOjIt0W-SeYAOjIt0W-SeY
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Guest Donation
                </Typography>
                You can make a donation without logging in using our secure
                payment forms. This form supports both Stripe and PayPal payment
                gateways.
              </Alert>

              <NonAuthDonation
                churchId={(import.meta as any).env.VITE_CHURCH_ID || ""}
                recaptchaSiteKey={
                  (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY || ""
                }
                churchLogo="https://via.placeholder.com/100x100/0066cc/ffffff?text=Church"
                showHeader={true}
              />
            </Box>
          ) : (
            // Authenticated user sees all donation components as specified in PRD
            <Stack spacing={4} sx={{ mt: 3 }}>
              <Alert severity="success">
                <Typography variant="h6" gutterBottom>
                  Welcome back, {context.user.firstName}!
                </Typography>
                Access all donation and payment management features below.
              </Alert>

              {/* Multi-Gateway Donation Form */}
              <Box>
                <Typography variant="h5" gutterBottom>
                  Make a Donation
                </Typography>
                <Elements stripe={stripePromise}>
                  {loadingAuthData ? (
                    <Alert severity="info">Loading donation data…</Alert>
                  ) : (
                    <MultiGatewayDonationForm
                      person={context.person as any}
                      customerId={customerId}
                      paymentMethods={paymentMethodsAll}
                      paymentGateways={paymentGateways}
                      stripePromise={
                        stripePromise as Promise<Stripe> | undefined
                      }
                      donationSuccess={(message: string) =>
                        alert(`Success: ${message}`)
                      }
                      church={context?.userChurch?.church}
                      churchLogo={undefined}
                    />
                  )}
                </Elements>
              </Box>

              <Divider />

              {/* Payment Methods Management */}
              <Box>
                <Typography variant="h5" gutterBottom>
                  Payment Methods
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Manage your saved payment methods for quick donations.
                </Alert>
                <Elements stripe={stripePromise}>
                  {loadingAuthData ? (
                    <Alert severity="info">Loading payment methods…</Alert>
                  ) : (
                    <PaymentMethods
                      person={context.person as any}
                      customerId={customerId}
                      paymentMethods={stripePaymentMethods}
                      stripePromise={stripePromise}
                      appName="AppHelper Playground"
                      dataUpdate={(_message?: string) => {
                        // Reload methods after add/edit/delete
                        if (context?.person?.id) {
                          ApiHelper.get(
                            `/paymentmethods/personid/${context.person.id}`,
                            "GivingApi",
                          )
                            .then((pms: any[]) => {
                              const stripePMs: StripePaymentMethod[] = [];
                              const allPMs: PaymentMethod[] = [];

                              for (const pm of pms || []) {
                                if (pm.provider === "stripe") {
                                  stripePMs.push(new StripePaymentMethod(pm));
                                }
                                allPMs.push(pm);

                                // Extract customer ID if we don't have one
                                if (pm.customerId && !customerId) {
                                  setCustomerId(pm.customerId);
                                }
                              }

                              setStripePaymentMethods(stripePMs);
                              setPaymentMethodsAll(allPMs);
                            })
                            .catch(() => {
                              /* ignore */
                            });
                        }
                      }}
                    />
                  )}
                </Elements>
              </Box>

              <Divider />

              {/* Recurring Donations Management */}
              <Box>
                <Typography variant="h5" gutterBottom>
                  Recurring Donations
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  View and manage your recurring donation subscriptions.
                </Alert>
                <Elements stripe={stripePromise}>
                  {loadingAuthData ? (
                    <Alert severity="info">Loading subscriptions…</Alert>
                  ) : (
                    <RecurringDonations
                      customerId={customerId || ""}
                      paymentMethods={stripePaymentMethods}
                      appName="AppHelper Playground"
                      dataUpdate={(_message?: string) => {
                        /* no-op */
                      }}
                    />
                  )}
                </Elements>
              </Box>

              <Divider />

              {/* Donation History */}
              <Box>
                <Typography variant="h5" gutterBottom>
                  Donation History
                </Typography>
                {historyError && (
                  <Alert severity="warning">{historyError}</Alert>
                )}
                {!history && !historyError && (
                  <Alert severity="info">Loading history…</Alert>
                )}
                {Array.isArray(history) && history.length === 0 && (
                  <Alert severity="info">No donations found.</Alert>
                )}
                {Array.isArray(history) && history.length > 0 && (
                  <ul>
                    {history.slice(0, 10).map((d: any) => (
                      <li key={d.id || d.donationId || `${d.date}-${d.amount}`}>
                        {new Date(
                          d.date || d.created || d.timestamp || Date.now(),
                        ).toLocaleDateString()}{" "}
                        —
                        {` ${CurrencyHelper.getCurrencySymbol(d.currency || "usd")} ${(d.amount || d.total || 0) / (d.amount && d.amount > 1000 ? 100 : 1)}`}
                        {d.funds &&
                          Array.isArray(d.funds) &&
                          d.funds.length > 0 && (
                            <>
                              {` — `}
                              {d.funds
                                .map(
                                  (f: any) =>
                                    `${f.name || ""} ${CurrencyHelper.getCurrencySymbol(d.currency || "usd")} ${f.amount}`,
                                )
                                .join(", ")}
                            </>
                          )}
                      </li>
                    ))}
                  </ul>
                )}
              </Box>
            </Stack>
          )}
        </ErrorBoundary>
      </Box>
    </Container>
  );
}
