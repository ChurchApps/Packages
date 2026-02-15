"use client";

import * as React from "react";
import { ErrorMessages, FloatingSupport, Loading } from "@churchapps/apphelper";
import { LoginResponseInterface, UserContextInterface, ChurchInterface, UserInterface, LoginUserChurchInterface, PersonInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, UserHelper, CommonEnvironmentHelper } from "@churchapps/helpers";
import { AnalyticsHelper, Locale } from "./helpers";
import { useCookies, CookiesProvider } from "react-cookie";
import { Register } from "./components/Register";
import { SelectChurchModal } from "./components/SelectChurchModal";
import { Forgot } from "./components/Forgot";
import { Alert, PaperProps } from "@mui/material";
import { Login } from "./components/Login";
import { LoginSetPassword } from "./components/LoginSetPassword";
import ga4 from "react-ga4";

interface Props {
	context: UserContextInterface,
	jwt: string,
	auth: string,
	keyName?: string,
	logo?: string,
	appName?: string,
	appUrl?: string,
	returnUrl?: string,
	userRegisteredCallback?: (user: UserInterface) => Promise<void>;
	churchRegisteredCallback?: (church: ChurchInterface) => Promise<void>;
	callbackErrors?: string[];
	showLogo?: boolean;
	showFooter?: boolean;
	loginContainerCssProps?: PaperProps;
	defaultEmail?: string;
	defaultPassword?: string;
	handleRedirect?: (url: string, user?: UserInterface, person?: PersonInterface, userChurch?: LoginUserChurchInterface, userChurches?: LoginUserChurchInterface[]) => void; // Function to handle redirects from parent component
}

const LoginPageContent: React.FC<Props> = ({ showLogo = true, loginContainerCssProps, ...props }) => {
  const [welcomeBackName, setWelcomeBackName] = React.useState("");
  const [pendingAutoLogin, setPendingAutoLogin] = React.useState(false);
  const [errors, setErrors] = React.useState([]);
  const [cookies, setCookie] = useCookies(["jwt", "name", "email", "lastChurchId"]);
  const [showForgot, setShowForgot] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);
  const [showSelectModal, setShowSelectModal] = React.useState(false);
  const [loginResponse, setLoginResponse] = React.useState<LoginResponseInterface>(null);
  const [userJwt, setUserJwt] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loginFormRef = React.useRef(null);
  const location = typeof window !== "undefined" && window.location;
  let selectedChurchId = "";
  let registeredChurch: ChurchInterface = null;
  let userJwtBackup = ""; //use state copy for storing between page updates.  This copy for instant availability.

  const cleanAppUrl = () => {
    if (!props.appUrl) return null;
    else {
      const index = props.appUrl.indexOf("/", 9);
      if (index === -1) return props.appUrl;
      else return props.appUrl.substring(0, index);
    }
  };

  React.useEffect(() => {
    if (props.callbackErrors?.length > 0) {
      setErrors(props.callbackErrors);
    }
  }, [props.callbackErrors]);

  const performLogout = () => {
    // Clear all authentication cookies
    setCookie("jwt", "", { path: "/", maxAge: 0 });
    setCookie("name", "", { path: "/", maxAge: 0 });
    setCookie("email", "", { path: "/", maxAge: 0 });
    setCookie("lastChurchId", "", { path: "/", maxAge: 0 });
    // Clear any JWT in the ApiHelper
    ApiHelper.clearPermissions();
    // Clear user context
    props.context.setUser(null);
    props.context.setUserChurches([]);
    props.context.setUserChurch(null);
    props.context.setPerson(null);
    // Show a logout success message
    setErrors(["You have been successfully logged out."]);

    // Handle redirect after logout
    const search = new URLSearchParams(location?.search);
    const returnUrl = search.get("returnUrl") || props.returnUrl || "/";

    // Use handleRedirect if available, otherwise use window.location
    if (props.handleRedirect) {
      props.handleRedirect(returnUrl);
    } else if (typeof window !== "undefined") {
      window.location.href = returnUrl;
    }
  };

  const init = () => {
    const search = new URLSearchParams(location?.search);
    const action = search.get("action");
    if (action === "logout") performLogout();
    else if (action === "forgot") setShowForgot(true);
    else if (action === "register") setShowRegister(true);
    else {
      if (!props.auth && props.jwt) {
        setWelcomeBackName(cookies.name);
        login({ jwt: props.jwt });
        setPendingAutoLogin(true);
      } else {
        setPendingAutoLogin(false);
      }
    }
  };

  const handleLoginSuccess = async (resp: LoginResponseInterface) => {
    userJwtBackup = resp.user.jwt;
    setUserJwt(userJwtBackup);
    ApiHelper.setDefaultPermissions(resp.user.jwt);
    setLoginResponse(resp);
    resp.userChurches.forEach(uc => { if (!uc.apis) uc.apis = []; });
    UserHelper.userChurches = resp.userChurches;

    setCookie("name", `${resp.user.firstName} ${resp.user.lastName}`, { path: "/" });
    setCookie("email", resp.user.email, { path: "/" });
    UserHelper.user = resp.user;

    // JWT church selection is handled by the server response, no client-side decoding needed

    const search = new URLSearchParams(location?.search);
    const churchIdInParams = search.get("churchId");

    if (props.keyName) selectChurchByKeyName();
    else if (churchIdInParams) selectChurch(churchIdInParams);
    else if (cookies.lastChurchId && ArrayHelper.getOne(resp.userChurches, "church.id", cookies.lastChurchId)) {
      selectedChurchId = cookies.lastChurchId;
      selectChurchById();
    } else setShowSelectModal(true);
  };

  const selectChurchById = async () => {
    await UserHelper.selectChurch(props.context, selectedChurchId, undefined);

    setCookie("lastChurchId", selectedChurchId, { path: "/" });

    if (registeredChurch) {
      AnalyticsHelper.logEvent("Church", "Register", UserHelper.currentUserChurch.church.name);
      try {
        if (CommonEnvironmentHelper.GoogleAnalyticsTag && typeof (window) !== "undefined") {
          ga4.gtag("event", "conversion", { send_to: "AW-427967381/Ba2qCLrXgJoYEJWHicwB" });
        }
      } catch { }
    } else AnalyticsHelper.logEvent("Church", "Select", UserHelper.currentUserChurch.church.name);

    if (props.churchRegisteredCallback && registeredChurch) {
      await props.churchRegisteredCallback(registeredChurch);
      registeredChurch = null;
      login({ jwt: userJwt || userJwtBackup });
    } else await continueLoginProcess();
  };

  const selectChurchByKeyName = async () => {
    if (!ArrayHelper.getOne(UserHelper.userChurches, "church.subDomain", props.keyName)) {
      const userChurch: LoginUserChurchInterface = await ApiHelper.post("/churches/select", { subDomain: props.keyName }, "MembershipApi");
      UserHelper.setupApiHelper(userChurch);
      setCookie("lastChurchId", userChurch.church.id, { path: "/" });
      //create/claim the person record and relogin
      await ApiHelper.get("/people/claim/" + userChurch.church.id, "MembershipApi");
      login({ jwt: userJwt || userJwtBackup });
      return;
    }
    await UserHelper.selectChurch(props.context, undefined, props.keyName);
    const selectedChurch = ArrayHelper.getOne(UserHelper.userChurches, "church.subDomain", props.keyName);
    if (selectedChurch) setCookie("lastChurchId", selectedChurch.church.id, { path: "/" });
    await continueLoginProcess();
    return;
  };

  async function continueLoginProcess() {
    if (UserHelper.currentUserChurch) {
      UserHelper.currentUserChurch.apis.forEach(api => {
        if (api.keyName === "MembershipApi") setCookie("jwt", api.jwt, { path: "/" });
      });
      try {
        if (UserHelper.currentUserChurch.church.id) ApiHelper.patch(`/userChurch/${UserHelper.user.id}`, { churchId: UserHelper.currentUserChurch.church.id, appName: props.appName, lastAccessed: new Date() }, "MembershipApi");
      } catch (e) {
        console.log("Could not update user church accessed date");
      }
    }

    props.context.setUser(UserHelper.user);
    props.context.setUserChurches(UserHelper.userChurches);
    props.context.setUserChurch(UserHelper.currentUserChurch);

    // Get or claim person before proceeding
    let person;
    try {
      person = await ApiHelper.get(`/people/${UserHelper.currentUserChurch.person?.id}`, "MembershipApi");
      if (person) props.context.setPerson(person);
    } catch {
      person = await ApiHelper.get("/people/claim/" + UserHelper.currentUserChurch.church.id, "MembershipApi");
      props.context.setPerson(person);
    }

    // Handle redirect with actual data
    const search = new URLSearchParams(location?.search);
    const returnUrl = search.get("returnUrl") || props.returnUrl || "/";
    if (returnUrl && typeof window !== "undefined") {
      // Use handleRedirect function if available, otherwise fallback to window.location
      if (props.handleRedirect) {
        props.handleRedirect(returnUrl, UserHelper.user, person, UserHelper.currentUserChurch, UserHelper.userChurches);
      } else {
        window.location.href = returnUrl;
      }
    }
  }

  async function selectChurch(churchId: string) {
    try {
      setErrors([]);
      selectedChurchId = churchId;
      setCookie("lastChurchId", churchId, { path: "/" });
      if (!ArrayHelper.getOne(UserHelper.userChurches, "church.id", churchId)) {
        const userChurch: LoginUserChurchInterface = await ApiHelper.post("/churches/select", { churchId: churchId }, "MembershipApi");
        UserHelper.setupApiHelper(userChurch);

        //create/claim the person record and relogin
        await ApiHelper.get("/people/claim/" + churchId, "MembershipApi");
        login({ jwt: userJwt || userJwtBackup });
        return;
      }
      UserHelper.selectChurch(props.context, churchId, null).then(() => { continueLoginProcess(); });
    } catch (err) {
      console.log("Error in selecting church: ", err);
      setErrors([Locale.label("login.validate.selectingChurch")]);
      loginFormRef?.current?.setSubmitting(false);
    }

  }

  const handleLoginErrors = (errors: string[]) => {
    setWelcomeBackName("");
    setErrors([Locale.label("login.validate.invalid")]);
  };

  const login = async (data: any) => {
    setErrors([]);
    setIsSubmitting(true);
    try {
      const resp: LoginResponseInterface = await ApiHelper.postAnonymous("/users/login", data, "MembershipApi");
      setIsSubmitting(false);
      handleLoginSuccess(resp);
    } catch (e: any) {
      setPendingAutoLogin(false);
      setWelcomeBackName("");
      if (!data.jwt) handleLoginErrors([e.toString()]);
      setIsSubmitting(false);
    }
  };;

  const getWelcomeBack = () => {
    if (welcomeBackName !== "") {
      const label = Locale.label("login.welcomeName") || "Welcome back, {}!";
      const parts = label.split("{}");
      return (
				<>
					<Alert severity="info">
						{parts[0]}{welcomeBackName}{parts[1] || ""}
					</Alert>
					<Loading />
				</>
      );
    }
  };
  const getCheckEmail = () => { if (new URLSearchParams(location?.search).get("checkEmail") === "1") return <Alert severity="info">{Locale.label("login.registerThankYou")}</Alert>; };
  const handleRegisterCallback = () => { setShowForgot(false); setShowRegister(true); };
  const handleLoginCallback = () => { setShowForgot(false); setShowRegister(false); };
  const handleChurchRegistered = (church: ChurchInterface) => { registeredChurch = church; setShowRegister(false); };

  const getInputBox = () => {
    if (showRegister) {
      return (

			<Register updateErrors={setErrors} appName={props.appName} appUrl={cleanAppUrl()} loginCallback={handleLoginCallback} userRegisteredCallback={props.userRegisteredCallback} />

      );
    } else if (showForgot) return (<Forgot registerCallback={handleRegisterCallback} loginCallback={handleLoginCallback} />);
    else if (props.auth) return (<LoginSetPassword setErrors={setErrors} setShowForgot={setShowForgot} isSubmitting={isSubmitting} auth={props.auth} login={login} appName={props.appName} appUrl={cleanAppUrl()} />);
    else return <Login setShowRegister={setShowRegister} setShowForgot={setShowForgot} setErrors={setErrors} isSubmitting={isSubmitting} login={login} mainContainerCssProps={loginContainerCssProps} defaultEmail={props.defaultEmail} defaultPassword={props.defaultPassword} showFooter={props.showFooter} />;
  };

	React.useEffect(init, []); //eslint-disable-line

  return (
		<>
			<ErrorMessages errors={errors} />
			{getWelcomeBack()}
			{getCheckEmail()}
			{!pendingAutoLogin && getInputBox()}
			<SelectChurchModal show={showSelectModal} userChurches={loginResponse?.userChurches} selectChurch={selectChurch} registeredChurchCallback={handleChurchRegistered} errors={errors} appName={props.appName} handleRedirect={props.handleRedirect} />
			<FloatingSupport appName={props.appName} />
		</>
  );

};

export const LoginPage: React.FC<Props> = (props) => {
  // Always wrap with CookiesProvider to ensure context is available
  return (
		<CookiesProvider defaultSetOptions={{ path: "/" }}>
			<LoginPageContent {...props} />
		</CookiesProvider>
  );
};
