"use client";

import React, { useState, useEffect } from "react";
import { DisplayBox } from "../..";
import { ApiHelper, CurrencyHelper, DateHelper } from "@churchapps/helpers";
import { Locale } from "../helpers";
import { SubscriptionInterface } from "@churchapps/helpers";
import { RecurringDonationsEdit } from ".";
import { Icon, IconButton, Table, TableBody, TableCell, TableRow, TableHead, Tooltip } from "@mui/material";
import { getPaymentProvider } from "../providers";

interface Props { customerId: string, paymentMethods: any[], appName: string, dataUpdate: (message?: string) => void, };

export const RecurringDonations: React.FC<Props> = (props) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionInterface[]>([]);
  const [mode, setMode] = useState("display");
  const [editSubscription, setEditSubscription] = useState<SubscriptionInterface>();
  const [currency, setCurrency] = useState<string>("usd");

  const loadData = () => {
    if (props.customerId) {
      ApiHelper.get("/customers/" + props.customerId + "/subscriptions", "GivingApi").then((subResult: any) => {
        const subscriptionData = subResult.data || [];
        if (subscriptionData.length === 0) {
          setSubscriptions([]);
          return;
        }

        const subs: SubscriptionInterface[] = [];
        const requests = subscriptionData.map((s: any) =>
          ApiHelper.get("/subscriptionfunds?subscriptionId=" + s.id, "GivingApi").then((subFunds: any) => {
            s.funds = subFunds;
            subs.push(s);
          }).catch(() => {
            s.funds = [];
            subs.push(s);
          }));

        Promise.all(requests).then(() => {
          setSubscriptions(subs);
        }).catch(() => {
          setSubscriptions(subs);
        });
      }).catch(() => {
        setSubscriptions([]);
      });
    }
  };

  const handleUpdate = (message?: string) => {
    loadData();
    setMode("display");
    if (message) props.dataUpdate(message);
  };

  const handleEdit = (sub: SubscriptionInterface) => (e: React.MouseEvent) => {
    e.preventDefault();
    setEditSubscription(sub);
    setMode("edit");
  };

  const handleCancelSubscription = (sub: any) => async () => {
    const confirmed = window.confirm("Are you sure you want to cancel this recurring donation?");
    if (!confirmed) return;
    try {
      // Pass provider so the API can resolve the right gateway (Stripe vs Kingdom Funding).
      const providerParam = sub.provider ? `?provider=${encodeURIComponent(sub.provider)}` : "";
      await ApiHelper.delete(`/subscriptions/${sub.id}${providerParam}`, "GivingApi");
      await ApiHelper.delete(`/subscriptionfunds/subscription/${sub.id}`, "GivingApi").catch((err: any) => {
        console.error("Failed to delete subscription funds for cancelled subscription:", sub.id, err);
      });
      props.dataUpdate("Recurring donation cancelled.");
      loadData();
    } catch (e: any) {
      console.error("Failed to cancel subscription:", e);
      alert("Failed to cancel recurring donation. Please try again.");
    }
  };

  const isPaused = (sub: any) => !!sub.pause_collection;

  const handlePauseSubscription = (sub: any) => async () => {
    const confirmed = window.confirm(Locale.label("donation.recurring.confirmPause"));
    if (!confirmed) return;
    try {
      const providerParam = sub.provider ? `?provider=${encodeURIComponent(sub.provider)}` : "";
      await ApiHelper.post(`/subscriptions/${sub.id}/pause${providerParam}`, {}, "GivingApi");
      props.dataUpdate(Locale.label("donation.recurring.pausedMessage"));
      loadData();
    } catch (e: any) {
      console.error("Failed to pause subscription:", e);
      alert(Locale.label("donation.recurring.pauseFailed"));
    }
  };

  const handleResumeSubscription = (sub: any) => async () => {
    try {
      const providerParam = sub.provider ? `?provider=${encodeURIComponent(sub.provider)}` : "";
      await ApiHelper.post(`/subscriptions/${sub.id}/resume${providerParam}`, {}, "GivingApi");
      props.dataUpdate(Locale.label("donation.recurring.resumedMessage"));
      loadData();
    } catch (e: any) {
      console.error("Failed to resume subscription:", e);
      alert(Locale.label("donation.recurring.resumeFailed"));
    }
  };

  const getPaymentMethod = (sub: SubscriptionInterface) => {
    const pm = props.paymentMethods.find((pm: any) => pm.id === (sub.default_payment_method || sub.default_source));
    if (!pm) return <span style={{ color: "red" }}>{Locale.label("donation.recurring.notFound")}</span>;
    return `${pm.name} ****${pm.last4 || ""}`;
  };

  const getInterval = (subscription: SubscriptionInterface) => {
    const interval = (subscription.plan?.interval_count || 1) + " " + (subscription.plan?.interval || "month");
    return (subscription.plan?.interval_count || 1) > 1 ? interval + "s" : interval;
  };

  const getFunds = (subscription: SubscriptionInterface) => {
    const result: React.ReactElement[] = [];
    subscription.funds?.forEach((fund: any) => {
      result.push(<div key={subscription.id + fund.id}>
        {fund.name} <span style={{ float: "right" }}>{CurrencyHelper.formatCurrencyWithLocale(fund.amount, currency)}</span>
      </div>);
    });
    const total = ((subscription.plan?.amount || 0) / 100);
    result.push(<div key={subscription.id + "-total"} style={{ borderTop: "solid #dee2e6 1px" }}>
        Total <span style={{ float: "right" }}>{CurrencyHelper.formatCurrencyWithLocale(total, currency)}</span>
    </div>);
    return result;
  };

  const getEditOptions = (sub: SubscriptionInterface) => {
    // Cancel always available; edit requires provider editRecurring support + saved methods.
    const capabilities = getPaymentProvider((sub as any).provider).capabilities;
    const canEdit = capabilities.editRecurring && (props?.paymentMethods?.length || 0) > 0;
    const canPause = capabilities.pauseRecurring;
    const paused = isPaused(sub);
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {paused && (
          <span style={{ color: "#f0ad4e", fontSize: 12, marginRight: 4 }}>{Locale.label("donation.recurring.paused")}</span>
        )}
        {canEdit && (
          <button
            type="button"
            aria-label="edit-button"
            onClick={handleEdit(sub)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6" }}
          >
            <Icon>edit</Icon>
          </button>
        )}
        {canPause && (
          paused ? (
            <Tooltip title={Locale.label("donation.recurring.resumeTooltip")}>
              <IconButton
                aria-label="resume-subscription"
                size="small"
                onClick={handleResumeSubscription(sub)}
                sx={{ color: "#28a745" }}
              >
                <Icon fontSize="small">play_arrow</Icon>
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title={Locale.label("donation.recurring.pauseTooltip")}>
              <IconButton
                aria-label="pause-subscription"
                size="small"
                onClick={handlePauseSubscription(sub)}
                sx={{ color: "#f0ad4e" }}
              >
                <Icon fontSize="small">pause</Icon>
              </IconButton>
            </Tooltip>
          )
        )}
        <Tooltip title="Cancel recurring donation">
          <IconButton
            aria-label="cancel-subscription"
            size="small"
            onClick={handleCancelSubscription(sub)}
            sx={{ color: "#dc3545" }}
          >
            <Icon fontSize="small">delete</Icon>
          </IconButton>
        </Tooltip>
      </div>
    );
  };

  const getTableHeader = () => {
    const result: React.ReactElement[] = [];
    result.push(<TableRow key="header" sx={{ textAlign: "left" }}><TableCell><b>{Locale.label("donation.recurring.startDate")}</b></TableCell><TableCell><b>{Locale.label("donation.recurring.amount")}</b></TableCell><TableCell><b>{Locale.label("donation.recurring.interval")}</b></TableCell><TableCell><b>{Locale.label("donation.recurring.paymentMethod")}</b></TableCell><TableCell></TableCell></TableRow>);
    return result;
  };

  const getTableRows = () => {
    const rows: React.ReactElement[] = [];

    subscriptions.forEach((sub: any) => {
      rows.push(<TableRow key={sub.id}>
        <TableCell>{DateHelper.prettyDate(new Date((sub.billing_cycle_anchor || 0) * 1000))}</TableCell>
        <TableCell>{getFunds(sub)}</TableCell>
        <TableCell>{Locale.label("donation.recurring.every")} {getInterval(sub)}</TableCell>
        <TableCell className="capitalize">{getPaymentMethod(sub)}</TableCell>
        <TableCell align="right">{getEditOptions(sub)}</TableCell>
      </TableRow>);
    });
    return rows;
  };

  const getSubscriptionsTable = () => (
    <Table>
      <TableHead>{getTableHeader()}</TableHead>
      <TableBody>{getTableRows()}</TableBody>
    </Table>
  );

  useEffect(loadData, []);

  useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      if (result) setCurrency(result);
    });
  }, []);

  if (mode === "display") {
    return (
      <DisplayBox data-testid="recurring-donations" headerIcon="restart_alt" headerText="Recurring Donations">
        {subscriptions.length > 0 ? getSubscriptionsTable() : <div>{Locale.label("donation.recurring.noSubscriptions") || "No recurring donations found."}</div>}
      </DisplayBox>
    );
  }
  if (mode === "edit" && editSubscription) {
    return (
      <RecurringDonationsEdit customerId={props.customerId} paymentMethods={props.paymentMethods} editSubscription={editSubscription} subscriptionUpdated={handleUpdate} />
    );
  }
  return null;
};
