
export class CommonEnvironmentHelper {
  public static AttendanceApi = "";
  public static DoingApi = "";
  public static GivingApi = "";
  public static MembershipApi = "";
  public static ReportingApi = "";
  public static MessagingApi = "";
  public static MessagingApiSocket = "";
  public static ContentApi = "";
  public static AskApi = "";
  public static GoogleAnalyticsTag = "";

  static ContentRoot = "";
  static B1Root = "";
  static B1AdminRoot = "";
  static LessonsRoot = "";

  static init = (stage: string) => {
    switch (stage) {
      case "demo": CommonEnvironmentHelper.initDemo(); break;
      case "staging": CommonEnvironmentHelper.initStaging(); break;
      case "prod": CommonEnvironmentHelper.initProd(); break;
      default: CommonEnvironmentHelper.initDev(); break;
    }
  };

  private static readApiBase = (): string =>
    process.env.REACT_APP_API_BASE
    || process.env.NEXT_PUBLIC_API_BASE
    || process.env.EXPO_PUBLIC_API_BASE
    || "";

  private static applyApiBase = (base: string) => {
    const trimmed = base.replace(/\/$/, "");
    CommonEnvironmentHelper.MembershipApi = trimmed + "/membership";
    CommonEnvironmentHelper.AttendanceApi = trimmed + "/attendance";
    CommonEnvironmentHelper.ContentApi = trimmed + "/content";
    CommonEnvironmentHelper.GivingApi = trimmed + "/giving";
    CommonEnvironmentHelper.MessagingApi = trimmed + "/messaging";
    CommonEnvironmentHelper.DoingApi = trimmed + "/doing";
    CommonEnvironmentHelper.ReportingApi = trimmed + "/reporting";
    // Derive WS URL from REST API when both point to localhost; avoids broadcasts on wrong server.
    try {
      const url = new URL(trimmed);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        CommonEnvironmentHelper.MessagingApiSocket = `ws://${url.hostname}:8087`;
      }
    } catch { /* base wasn't a valid URL — leave socket as-is */ }
  };

  static initDev = () => {
    CommonEnvironmentHelper.initStaging(); //Use staging values for anything not provided
    const base = CommonEnvironmentHelper.readApiBase();
    if (base) CommonEnvironmentHelper.applyApiBase(base);

    CommonEnvironmentHelper.MessagingApiSocket = process.env.REACT_APP_MESSAGING_API_SOCKET || process.env.NEXT_PUBLIC_MESSAGING_API_SOCKET || CommonEnvironmentHelper.MessagingApiSocket;
    CommonEnvironmentHelper.AskApi = process.env.REACT_APP_ASK_API || process.env.NEXT_PUBLIC_ASK_API || CommonEnvironmentHelper.AskApi;
    CommonEnvironmentHelper.GoogleAnalyticsTag = process.env.REACT_APP_GOOGLE_ANALYTICS || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || CommonEnvironmentHelper.GoogleAnalyticsTag;

    CommonEnvironmentHelper.ContentRoot = process.env.REACT_APP_CONTENT_ROOT || process.env.NEXT_PUBLIC_CONTENT_ROOT || CommonEnvironmentHelper.ContentRoot;
    CommonEnvironmentHelper.B1Root = process.env.REACT_APP_B1_ROOT || process.env.NEXT_PUBLIC_B1_ROOT || CommonEnvironmentHelper.B1Root;
    CommonEnvironmentHelper.B1AdminRoot = process.env.REACT_APP_B1ADMIN_ROOT || process.env.NEXT_PUBLIC_B1ADMIN_ROOT || CommonEnvironmentHelper.B1AdminRoot;
    CommonEnvironmentHelper.LessonsRoot = process.env.REACT_APP_LESSONS_ROOT || process.env.NEXT_PUBLIC_LESSONS_ROOT || CommonEnvironmentHelper.LessonsRoot;
  };

  //NOTE: None of these values are secret.
  static initDemo = () => {
    CommonEnvironmentHelper.applyApiBase("https://api.demo.churchapps.org");
    CommonEnvironmentHelper.MessagingApiSocket = "wss://socket.demo.churchapps.org";
    CommonEnvironmentHelper.AskApi = "https://askapi.demo.churchapps.org";
    CommonEnvironmentHelper.GoogleAnalyticsTag = "";

    CommonEnvironmentHelper.ContentRoot = "https://democontent.churchapps.org";
    CommonEnvironmentHelper.B1Root = "https://{key}.demosite.b1.church";
    CommonEnvironmentHelper.B1AdminRoot = "https://demo.b1.church";
    CommonEnvironmentHelper.LessonsRoot = "https://demo.lessons.church";
  };

  //NOTE: None of these values are secret.
  static initStaging = () => {
    CommonEnvironmentHelper.applyApiBase("https://api.staging.churchapps.org");
    CommonEnvironmentHelper.MessagingApiSocket = "wss://socket.staging.churchapps.org";
    CommonEnvironmentHelper.AskApi = "https://askapi.staging.churchapps.org";
    CommonEnvironmentHelper.GoogleAnalyticsTag = "";

    CommonEnvironmentHelper.ContentRoot = "https://content.staging.churchapps.org";
    CommonEnvironmentHelper.B1Root = "https://{key}.staging.b1.church";
    CommonEnvironmentHelper.B1AdminRoot = "https://admin.staging.b1.church";
    CommonEnvironmentHelper.LessonsRoot = "https://staging.lessons.church";
  };

  //NOTE: None of these values are secret.
  static initProd = () => {
    CommonEnvironmentHelper.applyApiBase("https://api.churchapps.org");
    CommonEnvironmentHelper.MessagingApiSocket = "wss://socket.churchapps.org";
    CommonEnvironmentHelper.AskApi = "https://askapi.churchapps.org";

    CommonEnvironmentHelper.ContentRoot = "https://content.churchapps.org";
    CommonEnvironmentHelper.B1Root = "https://{key}.b1.church";
    CommonEnvironmentHelper.B1AdminRoot = "https://admin.b1.church";
    CommonEnvironmentHelper.LessonsRoot = "https://lessons.church";
  };

}
