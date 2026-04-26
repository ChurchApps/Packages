"use client";

import React, { useEffect, useState } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CardForm, BankForm } from ".";
import { DisplayBox, Loading } from "../..";
import { ApiHelper, UserHelper } from "@churchapps/helpers";
import { Locale, StripePaymentMethod, PaymentGateway } from "../helpers";
import { PersonInterface, Permissions } from "@churchapps/helpers";
import { Icon, Table, TableBody, TableCell, TableRow, IconButton, Menu, MenuItem } from "@mui/material";

interface Props { person: PersonInterface, customerId: string, paymentMethods: StripePaymentMethod[], stripePromise: Promise<Stripe | null> | null, appName: string, dataUpdate: (message?: string) => void }

export const PaymentMethods: React.FC<Props> = (props) => {
  const [editPaymentMethod, setEditPaymentMethod] = useState<StripePaymentMethod>(new StripePaymentMethod());
  const [mode, setMode] = useState("display");
  const [verify, setVerify] = useState<boolean>(false);
  const [gateway, setGateway] = useState<PaymentGateway | undefined>(undefined);

  useEffect(() => {
    ApiHelper.get(`/donate/gateways/${UserHelper.currentUserChurch?.church?.id || ""}`, "GivingApi").then((response: any) => {
      const gateways = Array.isArray(response?.gateways) ? response.gateways : [];
      const stripeGateway = gateways.find((g: any) => g.provider?.toLowerCase() === "stripe");
      if (stripeGateway) setGateway(stripeGateway);
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
      ApiHelper.delete("/paymentmethods/" + editPaymentMethod.id + "/" + props.customerId, "GivingApi").then(() => {
        setMode("display");
        props.dataUpdate(Locale.label("donation.paymentMethods.deleted"));
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
          <MenuItem aria-label="add-card" onClick={handleEdit(new StripePaymentMethod({ type: "card" }))}>
            <Icon sx={{ mr: "3px" }}>credit_card</Icon> {Locale.label("donation.paymentMethods.addCard")}
          </MenuItem>
          <MenuItem aria-label="add-bank" onClick={handleEdit(new StripePaymentMethod({ type: "bank" }))}>
            <Icon sx={{ mr: "3px" }}>account_balance</Icon> {Locale.label("donation.paymentMethods.addBank")}
          </MenuItem>
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
          <TableCell className="capitalize">{getPMIcon(method.type)} {method.name + " ****" + method.last4}</TableCell>
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

  const EditForm = () => (
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

  const PaymentMethods = () => {
    if (mode === "display") {
      return (
        <DisplayBox aria-label="payment-methods-box" headerIcon="credit_card" headerText="Payment Methods" editContent={getNewContent()}>
          <PaymentMethodsTable></PaymentMethodsTable>
        </DisplayBox>
      );
    } else return <EditForm></EditForm>;
  };

  return props.stripePromise ? <PaymentMethods></PaymentMethods> : null;
};
