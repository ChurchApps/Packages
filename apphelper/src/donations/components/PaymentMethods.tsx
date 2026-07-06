"use client";

import React, { useEffect, useState, useRef } from "react";
import { DisplayBox, Loading } from "../..";
import { ApiHelper, UserHelper } from "@churchapps/helpers";
import { Locale, SavedPaymentMethod, PaymentGateway } from "../helpers";
import { getPaymentProvider, pickDefaultGateway } from "../providers";
import type { MemberEntryHandle } from "../providers";
import { PersonInterface, Permissions } from "@churchapps/helpers";
import {
  Icon, Table, TableBody, TableCell, TableRow, IconButton, Menu, MenuItem, Button, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";

interface Props { person: PersonInterface, customerId: string, paymentMethods: SavedPaymentMethod[], appName: string, dataUpdate: (message?: string) => void }

export const PaymentMethods: React.FC<Props> = (props) => {
  const [editPaymentMethod, setEditPaymentMethod] = useState<SavedPaymentMethod>(new SavedPaymentMethod());
  const [mode, setMode] = useState("display");
  const [verify, setVerify] = useState<boolean>(false);
  const [gateway, setGateway] = useState<PaymentGateway | undefined>(undefined);

  useEffect(() => {
    ApiHelper.get(`/donate/gateways/${UserHelper.currentUserChurch?.church?.id || ""}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      setGateway(pickDefaultGateway(gateways, "savedCard") || undefined);
    }).catch(() => {
      setGateway(undefined);
    });
  }, []);

  const handleEdit = (pm?: SavedPaymentMethod, verifyAccount?: boolean) => (e: React.MouseEvent) => {
    e.preventDefault();
    setEditPaymentMethod(pm || new SavedPaymentMethod());
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
            if (usesTokenEntry) {
              setShowAddCardDialog(true);
            } else {
              handleEdit(new SavedPaymentMethod({ type: "card" }))(e);
            }
          }}>
            <Icon sx={{ mr: "3px" }}>credit_card</Icon> {Locale.label("donation.paymentMethods.addCard")}
          </MenuItem>
          {canSaveBank && (
            <MenuItem aria-label="add-bank" onClick={handleEdit(new SavedPaymentMethod({ type: "bank" }))}>
              <Icon sx={{ mr: "3px" }}>account_balance</Icon> {Locale.label("donation.paymentMethods.addBank")}
            </MenuItem>
          )}
        </Menu>
      </>
    );
  };

  const getNewContent = () => {
    if (!UserHelper.checkAccess(Permissions.givingApi.settings.edit) &&
        props.person?.id !== UserHelper.currentUserChurch?.person?.id) return null;
    return <MenuIcon />;
  };

  const getEditOptions = (pm: SavedPaymentMethod) => {
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

    props.paymentMethods.forEach((method: SavedPaymentMethod) => {
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

  const provider = gateway ? getPaymentProvider(gateway.provider) : undefined;
  const canSaveCard = !!provider?.capabilities.savedCard;
  const canSaveBank = !!provider?.capabilities.savedBank;
  // Providers with an in-place edit form use it; token-entry providers use the add-card dialog.
  const usesTokenEntry = canSaveCard && !!provider?.MemberEntry && !provider?.MethodEditForm;
  const TokenEntry = provider?.MemberEntry;
  const MethodEditForm = provider?.MethodEditForm;
  const entryRef = useRef<MemberEntryHandle>(null);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | undefined>();
  const [showAddCardDialog, setShowAddCardDialog] = useState(false);

  const resetAddDialog = () => {
    setShowAddCardDialog(false);
    setAddError(undefined);
  };

  const handleTokenAddCard = async () => {
    if (!gateway) return;
    setSaving(true);
    setAddError(undefined);
    try {
      if (!entryRef.current) {
        setAddError("Card form not ready.");
        setSaving(false);
        return;
      }
      const token = await entryRef.current.tokenize();
      await ApiHelper.post("/paymentmethods/addcard", {
        personId: props.person?.id,
        customerId: props.customerId || undefined,
        email: props.person?.contactInfo?.email || "",
        name: props.person?.name?.display || "",
        provider: provider?.key,
        gatewayId: gateway?.id,
        id: token.id,
        type: token.type,
        cardBrand: token.brand,
        cardLast4: token.last4,
        expiry_month: token.expMonth,
        expiry_year: token.expYear
      }, "GivingApi");
      resetAddDialog();
      setMode("display");
      props.dataUpdate("Card saved successfully.");
    } catch (e: any) {
      setAddError(e.message || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  const tokenAddCardDialog = (
    <Dialog open={showAddCardDialog} onClose={resetAddDialog} maxWidth="sm" fullWidth>
      <DialogTitle>Add Payment Method</DialogTitle>
      <DialogContent>
        {gateway?.publicKey && showAddCardDialog && TokenEntry ? (
          <>
            <TokenEntry ref={entryRef} gateway={gateway} />
            {addError && <Alert severity="error" sx={{ mt: 1 }}>{addError}</Alert>}
          </>
        ) : !showAddCardDialog ? null : (
          <Alert severity="warning">Gateway not configured for adding payment methods.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={resetAddDialog}>Cancel</Button>
        {gateway?.publicKey && TokenEntry && (
          <Button variant="contained" onClick={handleTokenAddCard} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : "Save Card"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const EditForm = () => {
    if (MethodEditForm) {
      return (
        <MethodEditForm
          method={editPaymentMethod}
          verify={verify}
          customerId={props.customerId}
          person={props.person}
          gateway={gateway}
          onCancel={() => setMode("display")}
          onDelete={handleDelete}
          onUpdated={(message) => { props.dataUpdate(message); }}
        />
      );
    }

    // Token-entry providers: delete only (no in-place updates); add via dialog.
    if (editPaymentMethod.id) {
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
    // "Add new" for token-entry providers goes through the dialog; unreachable path.
    return null;
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

  if (!gateway || (!canSaveCard && !canSaveBank)) return null;
  return <><PaymentMethodsComponent />{usesTokenEntry && tokenAddCardDialog}</>;
};
