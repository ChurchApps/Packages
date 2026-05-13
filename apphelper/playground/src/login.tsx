import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { UserContextInterface } from "@churchapps/helpers";
import { LoginPage } from "../../src/login";
import UserContext from "./UserContext";

export default function PlaygroundLoginPage() {
  const context = React.useContext(UserContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!context) {
    return null;
  }

  const jwt = searchParams.get("jwt") ?? "";
  const auth = searchParams.get("auth") ?? "";
  const userContext = context as UserContextInterface;

  return (
    <LoginPage
      context={userContext}
      jwt={jwt}
      auth={auth}
      appName="APPHELPER PLAYGROUND"
      appUrl={
        typeof window !== "undefined" ? window.location.origin : undefined
      }
      handleRedirect={(url: string) => {
        const target = url || "/";
        if (target.startsWith("http://") || target.startsWith("https://")) {
          window.location.href = target;
          return;
        }
        navigate(target.startsWith("/") ? target : `/${target}`);
      }}
    />
  );
}
