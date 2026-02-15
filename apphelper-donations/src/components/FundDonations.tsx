"use client";

import React from "react";
import { FundDonation } from ".";
import { FundDonationInterface, FundInterface } from "@churchapps/helpers";
import { Locale } from "../helpers";

interface Props { fundDonations: FundDonationInterface[], funds: FundInterface[], params?: any, updatedFunction: (fundDonations: FundDonationInterface[]) => void, currency?: string }

export const FundDonations: React.FC<Props> = (props) => {
  const handleUpdated = (fundDonation: FundDonationInterface, index: number) => {
    const fundDonations = [...props.fundDonations];
    fundDonations[index] = fundDonation;
    props.updatedFunction(fundDonations);
  };

  const addRow = (e: React.MouseEvent) => {
    e.preventDefault();
    const fundDonations = [...props.fundDonations];
    const fd = { fundId: props.funds[0].id } as FundDonationInterface;
    fundDonations.push(fd);
    props.updatedFunction(fundDonations);
  };

  const getRows = () => {
    const result = [];
    for (let i = 0; i < props.fundDonations.length; i++) {
      const fd = props.fundDonations[i];
      result.push(<FundDonation fundDonation={fd} funds={props.funds} updatedFunction={handleUpdated} params={props?.params} key={fd.fundId || i} index={i} currency={props?.currency} />);
    }

    return result;
  };

  return (
    <>
      {getRows()}
      {(!props?.params?.fundId || props?.params?.fundId === "") &&
        <button
          type="button"
          aria-label="add-fund-donation"
          className="text-decoration"
          style={{
            display: "block",
            marginBottom: "15px",
            background: "none",
            border: "none",
            color: "#3b82f6",
            cursor: "pointer",
            textDecoration: "underline"
          }}
          onClick={addRow}
        >
          {Locale.label("donation.fundDonations.addMore")}
        </button>
      }
    </>
  );
};

