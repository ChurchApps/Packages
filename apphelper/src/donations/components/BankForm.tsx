"use client";

import React, { useState } from "react";
import { FormControl, Grid, InputLabel, MenuItem, Select, TextField, Button, CircularProgress, Box, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useStripe } from "@stripe/react-stripe-js";
import { InputBox, ErrorMessages } from "../..";
import { ApiHelper } from "@churchapps/helpers";
import { Locale, StripePaymentMethod, PaymentGateway } from "../helpers";
import { PersonInterface, PaymentMethodInterface, StripeBankAccountInterface, StripeBankAccountUpdateInterface, StripeBankAccountVerifyInterface } from "@churchapps/helpers";

interface Props {
  bank: StripePaymentMethod;
  showVerifyForm: boolean;
  customerId: string;
  person: PersonInterface;
  setMode: any;
  deletePayment: any;
  updateList: (message?: string) => void;
  gateway?: PaymentGateway;
  // New prop to enable Financial Connections flow
  useFinancialConnections?: boolean;
}

export const BankForm: React.FC<Props> = (props) => {
  const stripe = useStripe();
  const [bankAccount, setBankAccount] = useState<StripeBankAccountInterface>({ account_holder_name: props.bank.account_holder_name, account_holder_type: props.bank.account_holder_type, country: "US", currency: "usd" } as StripeBankAccountInterface);
  const [paymentMethod] = useState<PaymentMethodInterface>({
    customerId: props.customerId,
    personId: props.person.id,
    email: props.person.contactInfo.email,
    name: props.person.name.display,
    provider: props.bank.provider || "stripe",
    gatewayId: props.bank.gatewayId || props.gateway?.id
  });
  const [updateBankData] = useState<StripeBankAccountUpdateInterface>({
    paymentMethodId: props.bank.id,
    customerId: props.customerId,
    personId: props.person.id,
    bankData: { account_holder_name: props.bank.account_holder_name || "", account_holder_type: props.bank.account_holder_type || "individual" }
  } as StripeBankAccountUpdateInterface);
  const [verifyBankData, setVerifyBankData] = useState<StripeBankAccountVerifyInterface>({
    paymentMethodId: props.bank.id,
    customerId: props.customerId,
    amountData: { amounts: [] }
  });
  const [showSave, setShowSave] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const handleCancel = () => { props.setMode("display"); };
  const handleDelete = () => { props.deletePayment(); };
  const handleSave = () => {
    setShowSave(false);
    if (props.showVerifyForm) verifyBank();
    else props.bank.id ? updateBank() : createBank();
  };

  // New method using Financial Connections (recommended)
  const createBankWithFinancialConnections = async () => {
    if (!stripe) {
      setErrorMessage("Stripe is not available");
      setShowSave(true);
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      // Step 1: Create ACH SetupIntent on the backend
      const setupIntentResponse = await ApiHelper.post("/paymentmethods/ach-setup-intent", {
        personId: props.person.id,
        customerId: props.customerId,
        email: props.person.contactInfo.email,
        name: props.person.name.display,
        gatewayId: props.gateway?.id
      }, "GivingApi");

      if (setupIntentResponse?.error) {
        setErrorMessage(setupIntentResponse.error);
        setIsConnecting(false);
        setShowSave(true);
        return;
      }

      const { clientSecret } = setupIntentResponse;

      // Step 2: Collect bank account using Financial Connections
      const { error: collectError, setupIntent: collectedSetupIntent } = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: "us_bank_account",
          payment_method_data: {
            billing_details: {
              name: bankAccount.account_holder_name || props.person.name.display,
              email: props.person.contactInfo.email
            }
          }
        }
      });

      if (collectError) {
        setErrorMessage(collectError.message || "Failed to connect bank account");
        setIsConnecting(false);
        setShowSave(true);
        return;
      }

      // Check if user closed the modal without completing
      if (!collectedSetupIntent?.payment_method) {
        setErrorMessage("Bank account connection was not completed. Please try again.");
        setIsConnecting(false);
        setShowSave(true);
        return;
      }

      // Step 3: Confirm the SetupIntent to complete bank account attachment
      const { error: confirmError, setupIntent } = await stripe.confirmUsBankAccountSetup(clientSecret);

      if (confirmError) {
        setErrorMessage(confirmError.message || "Failed to confirm bank account");
        setIsConnecting(false);
        setShowSave(true);
        return;
      }

      if (setupIntent?.status === "succeeded") {
        props.updateList(Locale.label("donation.bankForm.added"));
        props.setMode("display");
      } else if (setupIntent?.status === "requires_action" || setupIntent?.next_action?.type === "verify_with_microdeposits") {
        // Bank requires micro-deposit verification (for some banks that don't support instant verification)
        props.updateList("Bank account added. Please check your bank statement for micro-deposits to verify.");
        props.setMode("display");
      } else {
        setErrorMessage("Unexpected status: " + setupIntent?.status);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Error connecting bank account");
      console.error(error);
    }

    setIsConnecting(false);
    setShowSave(true);
  };

  // Legacy method using bank tokens (deprecated - kept for backward compatibility)
  const createBankLegacy = async () => {
    if (!stripe) {
      setErrorMessage("Stripe is not available");
      setShowSave(true);
      return;
    }

    if (!bankAccount.routing_number || !bankAccount.account_number) {
      setErrorMessage(Locale.label("donation.bankForm.validate.accountNumber"));
    } else {
      try {
        const response = await stripe.createToken("bank_account", bankAccount);
        if (response?.error?.message) {
          setErrorMessage(response.error.message);
        } else if (response?.token?.id) {
          const pm: PaymentMethodInterface = {
            ...paymentMethod,
            id: response.token.id,
            provider: paymentMethod.provider || "stripe",
            gatewayId: paymentMethod.gatewayId || props.gateway?.id
          };
          const result = await ApiHelper.post("/paymentmethods/addbankaccount", pm, "GivingApi");
          if (result?.raw?.message) {
            setErrorMessage(result.raw.message);
          } else {
            props.updateList(Locale.label("donation.bankForm.added"));
            props.setMode("display");
          }
        } else {
          setErrorMessage("Failed to create token");
        }
      } catch (error) {
        setErrorMessage("Error creating bank token");
        console.error(error);
      }
    }
    setShowSave(true);
  };

  // Wrapper function that chooses the appropriate method
  const createBank = async () => {
    // Default to Financial Connections (new flow), fall back to legacy if explicitly disabled
    if (props.useFinancialConnections !== false) {
      await createBankWithFinancialConnections();
    } else {
      await createBankLegacy();
    }
  };

  const updateBank = async () => {
    if (!bankAccount.account_holder_name || bankAccount.account_holder_name === "") {
      setErrorMessage(Locale.label("donation.bankForm.validate.holderName"));
    } else {
      try {
        const bank = { ...updateBankData };
        bank.bankData.account_holder_name = bankAccount.account_holder_name;
        bank.bankData.account_holder_type = bankAccount.account_holder_type;
        const response = await ApiHelper.post(
          "/paymentmethods/updatebank",
          { ...bank, gatewayId: props.bank.gatewayId || props.gateway?.id, provider: props.bank.provider || "stripe" },
          "GivingApi"
        );
        if (response?.raw?.message) {
          setErrorMessage(response.raw.message);
        } else {
          props.updateList(Locale.label("donation.bankForm.updated"));
          props.setMode("display");
        }
      } catch (error) {
        setErrorMessage("Error updating bank account");
        console.error(error);
      }
    }
    setShowSave(true);
  };

  const verifyBank = async () => {
    const amounts = verifyBankData?.amountData?.amounts;
    if (amounts && amounts.length === 2 && amounts[0] !== "" && amounts[1] !== "") {
      try {
        const response = await ApiHelper.post(
          "/paymentmethods/verifyBank",
          { ...verifyBankData, gatewayId: props.bank.gatewayId || props.gateway?.id, provider: props.bank.provider || "stripe" },
          "GivingApi"
        );
        if (response?.raw?.message) {
          setErrorMessage(response.raw.message);
        } else {
          props.updateList(Locale.label("donation.bankForm.verified"));
          props.setMode("display");
        }
      } catch (error) {
        setErrorMessage("Error verifying bank account");
        console.error(error);
      }
    } else {
      setErrorMessage("Both deposit amounts are required.");
    }
    setShowSave(true);
  };

  const getHeaderText = () => props.bank.id
    ? `${props.bank.name?.toUpperCase() || "BANK"} ****${props.bank.last4 || ""}`
    : "Add New Bank Account";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const bankData = { ...bankAccount };
    const inputData = { [e.target.name]: e.target.value };
    setBankAccount({ ...bankData, ...inputData });
    setShowSave(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<any>) => {
    const pattern = /^\d+$/;
    if (!pattern.test(e.key)) e.preventDefault();
  };

  const handleVerify = (e: React.ChangeEvent<HTMLInputElement>) => {
    const verifyData = { ...verifyBankData };
    if (e.currentTarget.name === "amount1") verifyData.amountData.amounts[0] = e.currentTarget.value;
    if (e.currentTarget.name === "amount2") verifyData.amountData.amounts[1] = e.currentTarget.value;
    setVerifyBankData(verifyData);
  };

  const getForm = () => {
    if (props.showVerifyForm) {
      return (<>
        <p>{Locale.label("donation.bankForm.twoDeposits")}</p>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth aria-label="amount1" label={Locale.label("donation.bankForm.firstDeposit")} name="amount1" placeholder="00" inputProps={{ maxLength: 2 }} onChange={handleVerify} onKeyPress={handleKeyPress} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth aria-label="amount2" label={Locale.label("donation.bankForm.secondDeposit")} name="amount2" placeholder="00" inputProps={{ maxLength: 2 }} onChange={handleVerify} onKeyPress={handleKeyPress} />
          </Grid>
        </Grid>
      </>);
    } else if (!props.bank.id && props.useFinancialConnections !== false) {
      // New Financial Connections flow for adding bank accounts
      return (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Securely connect your bank account using Stripe Financial Connections.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You'll be redirected to log in to your bank and authorize the connection. Your bank credentials are never shared with us.
          </Typography>
          {isConnecting ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <CircularProgress size={24} />
              <Typography>Connecting to your bank...</Typography>
            </Box>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={createBankWithFinancialConnections}
              disabled={!stripe}
              sx={{ minWidth: 200 }}
            >
              Connect Bank Account
            </Button>
          )}
        </Box>
      );
    } else {
      // Editing existing bank account or legacy manual entry flow
      let accountDetails = <></>;
      if (!props.bank.id && props.useFinancialConnections === false) {
        // Legacy manual entry (only if Financial Connections is explicitly disabled)
        accountDetails = (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }} style={{ marginBottom: "20px" }}>
              <TextField fullWidth label={Locale.label("donation.bankForm.routingNumber")} type="number" name="routing_number" aria-label="routing-number" placeholder="Routing Number" className="form-control" onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} style={{ marginBottom: "20px" }}>
              <TextField fullWidth label={Locale.label("donation.bankForm.accountNumber")} type="number" name="account_number" aria-label="account-number" placeholder="Account Number" className="form-control" onChange={handleChange} />
            </Grid>
          </Grid>
        );
      }
      return (<>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }} style={{ marginBottom: "20px" }}>
            <TextField fullWidth label="Account Holder Name" name="account_holder_name" required aria-label="account-holder-name" placeholder="Account Holder Name" value={bankAccount.account_holder_name || ""} className="form-control" onChange={handleChange} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} style={{ marginBottom: "20px" }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("donation.bankForm.name")}</InputLabel>
              <Select label={Locale.label("donation.bankForm.name")} name="account_holder_type" aria-label="account-holder-type" value={bankAccount.account_holder_type || ""} onChange={handleChange}>
                <MenuItem value="individual">{Locale.label("donation.bankForm.individual")}</MenuItem>
                <MenuItem value="company">{Locale.label("donation.bankForm.company")}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {accountDetails}
      </>);
    }
  };

  // Determine if we should show the save button
  // Hide it when using Financial Connections for new accounts (it has its own button)
  const showSaveButton = props.bank.id || props.showVerifyForm || props.useFinancialConnections === false;

  return (
    <InputBox headerIcon="volunteer_activism" headerText={getHeaderText()} ariaLabelSave="save-button" ariaLabelDelete="delete-button" cancelFunction={handleCancel} saveFunction={showSaveButton && showSave ? handleSave : undefined} deleteFunction={props.bank.id && !props.showVerifyForm ? handleDelete : undefined}>
      {errorMessage && <ErrorMessages errors={[errorMessage]}></ErrorMessages>}
      <div>
        {!props.bank.id && props.useFinancialConnections === false && <p>{Locale.label("donation.bankForm.needVerified")}</p>}
        {getForm()}
      </div>
    </InputBox>
  );

};
