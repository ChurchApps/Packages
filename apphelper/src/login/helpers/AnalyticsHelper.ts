import ReactGA from "react-ga4";
import { CommonEnvironmentHelper, UserHelper } from "@churchapps/helpers";

export class AnalyticsHelper {

  static init = () => {
    if (CommonEnvironmentHelper.GoogleAnalyticsTag !== "" && typeof(window) !== "undefined") {
      try {
        ReactGA.initialize([{ trackingId: CommonEnvironmentHelper.GoogleAnalyticsTag }]);
        AnalyticsHelper.logPageView();
      } catch (error) {
        console.warn("Analytics initialization failed:", error);
      }
    }
  };

  static logPageView = () => {
    if (CommonEnvironmentHelper.GoogleAnalyticsTag !== "" && typeof(window) !== "undefined") {
      try {
        this.setChurchKey();
        ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
      } catch (error) {
        console.warn("Analytics page view logging failed:", error);
      }
    }
  };

  static logEvent = (category: string, action: string, label?:string) => {
    if (CommonEnvironmentHelper.GoogleAnalyticsTag !== "" && typeof(window) !== "undefined") {
      try {
        this.setChurchKey();
        ReactGA.event({ category, action, label });
      } catch (error) {
        console.warn("Analytics event logging failed:", error);
      }
    }
  };

  private static setChurchKey = () => {
    const churchKey = UserHelper?.currentUserChurch?.church?.subDomain;
    if (churchKey) ReactGA.set({ church_key: churchKey });
  };

}
