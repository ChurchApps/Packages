"use client";

import React, { useState } from "react";
import { LoginUserChurchInterface, UserContextInterface, ArrayHelper } from "@churchapps/helpers";
import { ApiHelper } from "@churchapps/helpers";
import { UserHelper } from "@churchapps/helpers";
import { NavItem } from "./NavItem";
import { Locale } from "../../helpers";

export interface Props { userChurches: LoginUserChurchInterface[], currentUserChurch: LoginUserChurchInterface, context: UserContextInterface, onDelete?: () => void, onChurchChange?: () => void }

export const ChurchList: React.FC<Props> = props => {
  const [userChurches, setUserChurches] = useState(() => {
    try {
      // If we have currentUserChurch, use it as fallback
      if (props.currentUserChurch && (!props.userChurches || !Array.isArray(props.userChurches))) {
        return [props.currentUserChurch];
      }

      let churches = props.userChurches;

      // Ensure we have an array
      if (!Array.isArray(churches)) {
        console.warn("ChurchList - Expected array but got:", typeof churches, churches);
        // If it's a plain church object and we have currentUserChurch, use that
        if (props.currentUserChurch) {
          return [props.currentUserChurch];
        }
        churches = [];
      }

      // Filter for valid userChurch objects (should have church property)
      const validChurches = churches.filter(uc => {
        const isValid = uc && uc.church && uc.church.id;
        if (!isValid) {
          console.warn("ChurchList - Invalid church structure:", uc);
        }
        return isValid;
      });

      // If no valid churches but we have currentUserChurch, use it
      if (validChurches.length === 0 && props.currentUserChurch) {
        return [props.currentUserChurch];
      }

      return validChurches;
    } catch (error) {
      console.error("ChurchList - Error processing churches:", error);
      // Last resort: if we have currentUserChurch, use it
      if (props.currentUserChurch) {
        return [props.currentUserChurch];
      }
      return [];
    }
  });

  // Update local state when props change
  React.useEffect(() => {
    try {
      // If we have currentUserChurch, use it as fallback
      if (props.currentUserChurch && (!props.userChurches || !Array.isArray(props.userChurches))) {
        setUserChurches([props.currentUserChurch]);
        return;
      }

      let churches = props.userChurches;

      // Ensure we have an array
      if (!Array.isArray(churches)) {
        if (props.currentUserChurch) {
          setUserChurches([props.currentUserChurch]);
          return;
        }
        churches = [];
      }

      // Filter for valid userChurch objects
      const validChurches = churches.filter(uc => uc && uc.church && uc.church.id);

      // If no valid churches but we have currentUserChurch, use it
      if (validChurches.length === 0 && props.currentUserChurch) {
        setUserChurches([props.currentUserChurch]);
      } else {
        setUserChurches(validChurches);
      }
    } catch (error) {
      console.error("ChurchList useEffect - Error updating churches:", error);
      if (props.currentUserChurch) {
        setUserChurches([props.currentUserChurch]);
      } else {
        setUserChurches([]);
      }
    }
  }, [props.userChurches, props.currentUserChurch]);

  const handleDelete = async (uc: LoginUserChurchInterface) => {
    // Helper function to get label with fallback
    const getLabel = (key: string, fallback: string) => {
      const label = Locale.label(key);
      return label && label !== key ? label : fallback;
    };

    const confirmMessage = getLabel("wrapper.sureRemoveChurch", "Are you sure you wish to delete this church? You will no longer be a member of {}.").replace("{}", uc.church.name?.toUpperCase() || "");
    if (window.confirm(confirmMessage)) {
      await ApiHelper.delete(`/userchurch/record/${props.context.user.id}/${uc.church.id}/${uc.person.id}`, "MembershipApi");
      await ApiHelper.delete(`/rolemembers/self/${uc.church.id}/${props.context.user.id}`, "MembershipApi");
      // remove the same from userChurches
      const idx = ArrayHelper.getIndex(UserHelper.userChurches, "church.id", uc.church.id);
      if (idx > -1) UserHelper.userChurches.splice(idx, 1);
      props?.onDelete?.();
    }
  };

  // Helper function to get label with fallback
  const getLabel = (key: string, fallback: string) => {
    const label = Locale.label(key);
    return label && label !== key ? label : fallback;
  };

  const result: React.ReactElement[] = [];

  userChurches.forEach(uc => {
    const userChurch = uc;
    const churchName = uc.church.name;
    result.push(<NavItem
      key={userChurch.church.id}
      selected={(uc.church.id === props.currentUserChurch.church.id) && true}
      onClick={async () => {
			  await UserHelper.selectChurch(props.context, userChurch.church.id, undefined);

			  // Call the onChurchChange callback if provided
			  if (props.onChurchChange) {
			    props.onChurchChange();
			  }
      }}
      label={churchName || "Unknown"}
      icon="church"
      deleteIcon={uc.church.id !== props.currentUserChurch.church.id ? "delete" : undefined}
      deleteLabel={getLabel("wrapper.deleteChurch", "Delete")}
      deleteFunction={() => { handleDelete(uc); }}
    />);
  });

  return <div id="church-list">{result}</div>;
};
