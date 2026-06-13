"use client";

import React, { useEffect, useState, useRef } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CardForm, BankForm } from ".";
import { KingdomFundingTokenForm, KingdomFundingTokenFormHandle } from "./KingdomFundingTokenForm";
import { DisplayBox, Loading } from "../..";
import { ApiHelper, UserHelper } from "@churchapps/helpers";
import { Locale, StripePaymentMethod, PaymentGateway, DonationHelper } from "../helpers";
import { PersonInterface, Permissions } from "@churchapps/helpers";
import {
  Icon, Table, TableBody, TableCell, TableRow, IconButton, Menu, MenuItem, Button, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";

// Kingdom Funding ACH is hidden in the UI pending hosted ACH tokenization support
// from the gateway. Flip to true once tokenization no longer requires raw routing/
// account numbers to flow through our backend.
const KF_ACH_ENABLED = false;

interface Props { person: PersonInterface, customerId: string, paymentMethods: StripePaymentMethod[], stripePromise: Promise<Stripe | null> | null, appName: string, dataUpdate: (message?: string) => void }

export const PaymentMethods: React.FC<Props> = (props) => {
  const [editPaymentMethod, setEditPaymentMethod] = useState<StripePaymentMethod>(new StripePaymentMethod());
  const [mode, setMode] = useState("display");
  const [verify, setVerify] = useState<boolean>(false);
  const [gateway, setGateway] = useState<PaymentGateway | undefined>(undefined);

  useEffect(() => {
    ApiHelper.get(`/donate/gateways/${UserHelper.currentUserChurch?.church?.id || ""}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const stripeGateway = DonationHelper.findGatewayByProvider(gateways, "stripe");
      const kfGateway = DonationHelper.findGatewayByProvider(gateways, "kingdomfunding");
      setGateway(stripeGateway || kfGateway);
    }).catch(() => {
      setGateway(undefined);
    });
  }, []);

  const handleEdit = (pm?: StripePaymentMethod, verifyAccount?: boolean) => (e: React.MouseEvent) => {
    e.preventDefault();
    setEditPaymentMethod(pm || new StripePaymentMethod());
    setVerify(verifyAccount || false);
    setMode("edit");
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(Locale.label("donation.paymentMethods.confirmDelete"));
    if (confirmed) {
      const providerParam = editPaymentMethod.provider ? `?provider=${editPaymentMethod.provider}` : "";
      ApiHelper.delete("/paymentmethods/" + editPaymentMethod.id + "/" + props.customerId + providerParam, "GivingApi").then(() => {
        setMode("display");
        props.dataUpdate(Locale.label("donation.paymentMethods.deleted"));
      }).catch((err: any) => {
        console.error("Failed to delete payment method:", err);
        alert("Failed to delete payment method. Please try again.");
      });
    }
  };

  const MenuIcon = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(e.currentTarget);
    };
    const handleClose = () => {
      setAnchorEl(null);
    };
    return (
      <>
        <IconButton
          aria-label="add-button"
          id="addBtnGroup"
          aria-controls={open ? "add-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-haspopup="true"
          onClick={handleClick}
        >
          <Icon color="primary">add</Icon>
        </IconButton>
        <Menu
          id="add-menu"
          MenuListProps={{ "aria-labelledby": "addBtnGroup" }}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
        >
          <MenuItem aria-label="add-card" onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            setAnchorEl(null);
            if (isKF) {
              // Open the KF dialog directly — avoids setState during render in EditForm
              setShowAddCardDialog(true);
            } else {
              handleEdit(new StripePaymentMethod({ type: "card" }))(e);
            }
          }}>
            <Icon sx={{ mr: "3px" }}>credit_card</Icon> {Locale.label("donation.paymentMethods.addCard")}
          </MenuItem>
          {(!isKF || KF_ACH_ENABLED) && (
            <MenuItem aria-label="add-bank" onClick={handleEdit(new StripePaymentMethod({ type: "bank" }))}>
              <Icon sx={{ mr: "3px" }}>account_balance</Icon> {Locale.label("donation.paymentMethods.addBank")}
            </MenuItem>
          )}
        </Menu>
      </>
    );
  };

  const getNewContent = () => {
    // Allow adding payment methods if user has admin permissions OR it's their own account
    if (!UserHelper.checkAccess(Permissions.givingApi.settings.edit) &&
        props.person?.id !== UserHelper.currentUserChurch?.person?.id) return null;
    return <MenuIcon />;
  };

  const getEditOptions = (pm: StripePaymentMethod) => {
    // Allow editing payment methods if user has admin permissions OR it's their own account
    if (!UserHelper.checkAccess(Permissions.givingApi.settings.edit) &&
        props.person?.id !== UserHelper.currentUserChurch?.person?.id) return null;
    return <button
      type="button"
      aria-label="edit-button"
      onClick={handleEdit(pm)}
      style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6" }}
    >
      <Icon>edit</Icon>
    </button>;
  };

  const getPMIcon = (type: string) => (type === "card" ? <Icon>credit_card</Icon> : <Icon>account_balance</Icon>);

  const getPaymentRows = () => {
    const rows: React.ReactElement[] = [];

    props.paymentMethods.forEach((method: StripePaymentMethod) => {
      rows.push(<TableRow key={method.id}>
        <TableCell className="capitalize">{getPMIcon(method.type)} {method.name}{method.last4 ? ` ****${method.last4}` : ""}</TableCell>
        <TableCell>{method?.status === "new" && <button
          type="button"
          aria-label="verify-account"
          onClick={handleEdit(method, true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", textDecoration: "underline" }}
        >
          {Locale.label("donation.paymentMethods.verify")}
        </button>}</TableCell>
        <TableCell align="right">{getEditOptions(method)}</TableCell>
      </TableRow>);
    });
    return rows;
  };

  const PaymentMethodsTable = () => {
    if (!props.paymentMethods) return <Loading></Loading>;
    if (props.paymentMethods.length) {
      return (
        <Table>
          <TableBody>
            {getPaymentRows()}
          </TableBody>
        </Table>
      );
    } else return <div>{Locale.label("donation.paymentMethods.noMethod")}</div>;
  };

  const isKF = !!gateway && DonationHelper.isKingdomFunding(gateway.provider);
  const kfTokenRef = useRef<KingdomFundingTokenFormHandle>(null);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | undefined>();
  const [showAddCardDialog, setShowAddCardDialog] = useState(false);

  const resetKFDialog = () => {
    setShowAddCardDialog(false);
    setAddError(undefined);
  };

  const handleKFAddCard = async () => {
    if (!gateway) return;
    setSaving(true);
    setAddError(undefined);
    try {
      const basePayload: any = {
        personId: props.person?.id,
        customerId: props.customerId || undefined,
        email: props.person?.contactInfo?.email || "",
        name: props.person?.name?.display || "",
        provider: "kingdomfunding"
      };

      if (!kfTokenRef.current) {
        setAddError("Card form not ready.");
        setSaving(false);
        return;
      }
      const tokenResult = await kfTokenRef.current.getNonce();
      basePayload.id = tokenResult.nonce;
      basePayload.cardBrand = tokenResult.cardType;
      basePayload.cardLast4 = tokenResult.last4;
      basePayload.expiry_month = tokenResult.expiryMonth;
      basePayload.expiry_year = tokenResult.expiryYear;

      await ApiHelper.post("/paymentmethods/addcard", basePayload, "GivingApi");
      resetKFDialog();
      setMode("display");
      props.dataUpdate("Card saved successfully.");
    } catch (e: any) {
      setAddError(e.message || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  const kfAddCardDialog = (
    <Dialog open={showAddCardDialog} onClose={resetKFDialog} maxWidth="sm" fullWidth>
      <DialogTitle>Add Payment Method</DialogTitle>
      <DialogContent>
        {gateway?.publicKey && showAddCardDialog ? (
          <>
            <KingdomFundingTokenForm
              ref={kfTokenRef}
              tokenizationKey={gateway.publicKey}
              sandbox={gateway?.settings?.sandbox === true || gateway?.environment === "sandbox"}
            />
            {addError && <Alert severity="error" sx={{ mt: 1 }}>{addError}</Alert>}
          </>
        ) : !showAddCardDialog ? null : (
          <Alert severity="warning">Gateway not configured for adding payment methods.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={resetKFDialog}>Cancel</Button>
        {gateway?.publicKey && (
          <Button variant="contained" onClick={handleKFAddCard} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : "Save Card"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const EditForm = () => {
    // KF gateway — edit/delete existing only (add new is handled by dialog)
    if (isKF) {
      if (editPaymentMethod.id) {
        // Editing existing payment method (delete only — KF cards cannot be updated in place)
        return (
          <DisplayBox headerIcon="credit_card" headerText={`${editPaymentMethod.name || "Card"} ****${editPaymentMethod.last4 || ""}`}>
            <div style={{ padding: 16 }}>
              <p>Type: {editPaymentMethod.type === "card" ? "Credit/Debit Card" : "Bank Account"}</p>
              <button
                type="button"
                onClick={handleDelete}
                style={{ background: "#dc3545", color: "white", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer", marginRight: 8 }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setMode("display")}
                style={{ background: "#6c757d", color: "white", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </DisplayBox>
        );
      }
      // "Add new" on KF is handled by the dialog opened from MenuIcon; this
      // fallback path is unreachable in normal flow. Render nothing rather
      // than setState during render.
      return null;
    }

    return (
      <Elements stripe={props.stripePromise}>
        {editPaymentMethod.type === "card" && (
          <CardForm
            card={editPaymentMethod}
            customerId={props.customerId}
            person={props.person}
            setMode={setMode}
            deletePayment={handleDelete}
            updateList={(message) => {
              props.dataUpdate(message);
            }}
            gateway={gateway}
          />
        )}
        {editPaymentMethod.type === "bank" && (
          <BankForm
            bank={editPaymentMethod}
            showVerifyForm={verify}
            customerId={props.customerId}
            person={props.person}
            setMode={setMode}
            deletePayment={handleDelete}
            updateList={(message) => {
              props.dataUpdate(message);
            }}
            gateway={gateway}
          />
        )}
      </Elements>
    );
  };

  const PaymentMethodsComponent = () => {
    if (mode === "display") {
      return (
        <DisplayBox aria-label="payment-methods-box" headerIcon="credit_card" headerText="Payment Methods" editContent={getNewContent()}>
          <PaymentMethodsTable></PaymentMethodsTable>
        </DisplayBox>
      );
    } else return <EditForm></EditForm>;
  };

  // Allow rendering for KF even without stripePromise
  return (props.stripePromise || isKF) ? <><PaymentMethodsComponent />{isKF && kfAddCardDialog}</> : null;
};
