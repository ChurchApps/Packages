"use client";

import React, { useEffect } from "react";
import { useCookies, CookiesProvider } from "react-cookie";
import { ApiHelper, UserContextInterface } from "@churchapps/helpers";

interface Props { context?: UserContextInterface, handleRedirect?: (url: string) => void }

const LogoutPageContent: React.FC<Props> = (props) => {
  const [, , removeCookie] = useCookies(["jwt", "email", "name", "lastChurchId"]);

  useEffect(() => {
    removeCookie("jwt");
    removeCookie("email");
    removeCookie("name");
    removeCookie("lastChurchId");

    ApiHelper.clearPermissions();
    props.context?.setUser(null);
    props.context?.setPerson(null);
    props.context?.setUserChurches(null);
    props.context?.setUserChurch(null);

    const t = setTimeout(() => {
      if (typeof window === "undefined") return;
      if (props.handleRedirect) props.handleRedirect("/");
      else window.location.href = "/";
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return null;
};

export const LogoutPage: React.FC<Props> = (props) => {
  return (
		<CookiesProvider defaultSetOptions={{ path: "/" }}>
			<LogoutPageContent {...props} />
		</CookiesProvider>
  );
};
