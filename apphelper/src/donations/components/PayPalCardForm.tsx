"use client";

import React, { useState, useCallback } from "react";
import { Grid, TextField, Box } from "@mui/material";

interface PayPalCardFormProps {
  onCardDataChange?: (cardData: PayPalCardData) => void;
  style?: React.CSSProperties;
}

export interface PayPalCardData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  isValid: boolean;
  errors: string[];
}

const validateCardNumber = (number: string): boolean => {
  // Remove spaces and non-numeric characters
  const cleanNumber = number.replace(/\D/g, "");

  // Check length (13-19 digits for most cards)
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

const validateExpiryDate = (month: string, year: string): boolean => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const expMonth = parseInt(month);
  let expYear = parseInt(year);

  // Support 2-digit year inputs by converting to full year (e.g., 25 => 2025)
  if (!isNaN(expYear) && expYear < 100) expYear = 2000 + expYear;

  if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) return false;
  if (isNaN(expYear)) return false;
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;

  return true;
};

const validateCVV = (cvv: string): boolean => {
  return /^\d{3,4}$/.test(cvv);
};

export const PayPalCardForm: React.FC<PayPalCardFormProps> = ({ onCardDataChange, style }) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [holderName, setHolderName] = useState("");

  const formatCardNumber = (value: string): string => {
    // Remove all non-numeric characters
    const numericOnly = value.replace(/\D/g, "");

    // Add spaces every 4 digits
    const formatted = numericOnly.replace(/(\d{4})(?=\d)/g, "$1 ");

    // Limit to 19 digits (including spaces)
    return formatted.substring(0, 23);
  };

  const validateAndNotify = useCallback((
    cardNum: string,
    expMonth: string,
    expYear: string,
    cvvValue: string,
    name: string
  ) => {
    const errors: string[] = [];
    const cleanCardNumber = cardNum.replace(/\D/g, "");

    if (!name.trim()) {
      errors.push("Card holder name is required");
    }

    if (!validateCardNumber(cleanCardNumber)) {
      errors.push("Invalid card number");
    }

    if (!validateExpiryDate(expMonth, expYear)) {
      errors.push("Invalid expiry date");
    }

    if (!validateCVV(cvvValue)) {
      errors.push("Invalid CVV");
    }

    const cardData: PayPalCardData = {
      cardNumber: cleanCardNumber,
      expiryMonth: expMonth.padStart(2, "0"),
      expiryYear: expYear,
      cvv: cvvValue,
      holderName: name,
      isValid: errors.length === 0,
      errors
    };

    onCardDataChange?.(cardData);
  }, [onCardDataChange]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    validateAndNotify(formatted, expiryMonth, expiryYear, cvv, holderName);
  };

  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 2);
    setExpiryMonth(value);
    validateAndNotify(cardNumber, value, expiryYear, cvv, holderName);
  };

  const handleExpiryYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 4);
    setExpiryYear(value);
    validateAndNotify(cardNumber, expiryMonth, value, cvv, holderName);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 4);
    setCvv(value);
    validateAndNotify(cardNumber, expiryMonth, expiryYear, value, holderName);
  };

  const handleHolderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHolderName(value);
    validateAndNotify(cardNumber, expiryMonth, expiryYear, cvv, value);
  };

  // Note: years and months arrays could be used for dropdown selects if needed in the future

  return (
    <Box style={{ ...style }} sx={{ p: 1.5, backgroundColor: "white", border: "1px solid #ccc", borderRadius: 1 }}>
      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField
            fullWidth
            label="Card Holder Name"
            value={holderName}
            onChange={handleHolderNameChange}
            placeholder="John Doe"
            size="small"
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            label="Card Number"
            value={cardNumber}
            onChange={handleCardNumberChange}
            placeholder="1234 5678 9012 3456"
            inputProps={{ maxLength: 23 }}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            fullWidth
            label="Month"
            value={expiryMonth}
            onChange={handleExpiryMonthChange}
            placeholder="MM"
            inputProps={{ maxLength: 2 }}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            fullWidth
            label="Year"
            value={expiryYear}
            onChange={handleExpiryYearChange}
            placeholder="YYYY"
            inputProps={{ maxLength: 4 }}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="CVV"
            value={cvv}
            onChange={handleCvvChange}
            placeholder="123"
            inputProps={{ maxLength: 4 }}
            size="small"
          />
        </Grid>
      </Grid>
    </Box>
  );
};
