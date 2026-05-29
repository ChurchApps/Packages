"use client";

import React, { useEffect, useState } from "react";
import { Grid, TextField } from "@mui/material";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { InputBox, ErrorMessages } from "../..";
import { ApiHelper } from "@churchapps/helpers";
import { Locale, StripePaymentMethod, PaymentGateway } from "../helpers";
import { PersonInterface, PaymentMethodInterface, StripeCardUpdateInterface } from "@churchapps/helpers";

interface Props {
  card: StripePaymentMethod;
  customerId: string;
  person: PersonInterface;
  setMode: any;
  deletePayment: any;
  updateList: (message: string) => void;
  gateway?: PaymentGateway;
}

export const CardForm: React.FC<Props> = (props) => {
  const stripe = useStripe();
  const elements = useElements();
  const formStyling = { style: { base: { fontSize: "18px" } } };
  const [showSave, setShowSave] = useState(true);
  const [paymentMethod] = useState<PaymentMethodInterface>({
    id: props.card.id,
    customerId: props.customerId,
    personId: props.person.id,
    email: props.person.contactInfo.email,
    name: props.person.name.display,
    provider: (props.card.provider as "stripe" | "paypal") || "stripe",
    gatewayId: props.card.gatewayId || props.gateway?.id
  });
  const [cardUpdate, setCardUpdate] = useState<StripeCardUpdateInterface>({
    personId: props.person.id,
    paymentMethodId: props.card.id,
    cardData: { card: { exp_year: "", exp_month: "" } }
  } as StripeCardUpdateInterface);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleCancel = () => { props.setMode("display"); };
  const handleSave = () => { setShowSave(false); props.card.id ? updateCard() : createCard(); };
  const saveDisabled = () => { /* Function for disabled save state */ };
  const handleDelete = () => { props.deletePayment(); };

  const handleKeyPress = (e: React.KeyboardEvent<any>) => {
    const pattern = /^\d+$/;
    if (!pattern.test(e.key)) e.preventDefault();
  };

  useEffect(() => {
    setCardUpdate({
      ...cardUpdate,
      cardData: { card: { exp_year: props.card?.exp_year?.toString().slice(2) || "", exp_month: props.card?.exp_month || "" } }
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const card = { ...cardUpdate };
    if (e.currentTarget.name === "exp_month") card.cardData.card.exp_month = e.currentTarget.value;
    if (e.currentTarget.name === "exp_year") card.cardData.card.exp_year = e.currentTarget.value;
    setCardUpdate(card);
    setShowSave(true);
  };

  const createCard = async () => {
    if (!stripe || !elements) {
      setErrorMessage("Stripe is not available");
      setShowSave(true);
      return;
    }

    const cardData = elements.getElement(CardElement);
    if (!cardData) {
      setErrorMessage("Card element not found");
      setShowSave(true);
      return;
    }

    try {
      const stripePM = await stripe.createPaymentMethod({
        type: "card",
        card: cardData
      });

      if (stripePM.error) {
        setErrorMessage(stripePM.error.message || "Card creation failed");
        setShowSave(true);
      } else if (stripePM.paymentMethod?.id) {
        const pm: PaymentMethodInterface = {
          ...paymentMethod,
          id: stripePM.paymentMethod.id,
          provider: paymentMethod.provider || "stripe",
          gatewayId: paymentMethod.gatewayId || props.gateway?.id
        };
        const result = await ApiHelper.post("/paymentmethods/addcard", pm, "GivingApi");
        if (result?.raw?.message) {
          setErrorMessage(result.raw.message);
          setShowSave(true);
        } else {
          props.updateList(Locale.label("donation.cardForm.added"));
          props.setMode("display");
        }
      } else {
        setErrorMessage("Failed to create payment method");
        setShowSave(true);
      }
    } catch (error) {
      setErrorMessage("Error creating card");
      console.error(error);
      setShowSave(true);
    }
  };

  const updateCard = async () => {
    if (!cardUpdate.cardData.card.exp_month || !cardUpdate.cardData.card.exp_year) {
      setErrorMessage("Expiration month and year cannot be blank.");
    } else {
      try {
        const result = await ApiHelper.post(
          "/paymentmethods/updatecard",
          { ...cardUpdate, gatewayId: props.card.gatewayId || props.gateway?.id, provider: props.card.provider || "stripe" },
          "GivingApi"
        );
        if (result?.raw?.message) {
          setErrorMessage(result.raw.message);
          setShowSave(true);
        } else {
          props.updateList(Locale.label("donation.cardForm.updated"));
          props.setMode("display");
        }
      } catch (error) {
        setErrorMessage("Error updating card");
        console.error(error);
        setShowSave(true);
      }
    }
  };

  const getHeaderText = () => props.card.id
    ? `${props.card.name?.toUpperCase() || "CARD"} ****${props.card.last4 || ""}`
    : Locale.label("donation.cardForm.addNew");

  return (
    <InputBox headerIcon="volunteer_activism" headerText={getHeaderText()} ariaLabelSave="save-button" ariaLabelDelete="delete-button" cancelFunction={handleCancel} saveFunction={showSave ? handleSave : saveDisabled} deleteFunction={props.card.id ? handleDelete : undefined}>
      {errorMessage && <ErrorMessages errors={[errorMessage]}></ErrorMessages>}
      <div>
        {!props.card.id
          ? <CardElement options={formStyling} />
          : <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth aria-label="card-exp-month" label={Locale.label("donation.cardForm.expirationMonth")} name="exp_month" value={cardUpdate.cardData.card.exp_month || ""} placeholder="MM" inputProps={{ maxLength: 2 }} onChange={handleChange} onKeyPress={handleKeyPress} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth aria-label="card-exp-year" label={Locale.label("donation.cardForm.expirationYear")} name="exp_year" value={cardUpdate.cardData.card.exp_year || ""} placeholder="YY" inputProps={{ maxLength: 2 }} onChange={handleChange} onKeyPress={handleKeyPress} />
            </Grid>
          </Grid>
        }
      </div>
    </InputBox>
  );

};
