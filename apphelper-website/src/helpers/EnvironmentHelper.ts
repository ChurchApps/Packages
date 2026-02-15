import { ApiHelper, CommonEnvironmentHelper } from "@churchapps/apphelper";

export class EnvironmentHelper {
  static Common = CommonEnvironmentHelper;
  static hasInit = false;

  static init = () => {
    if (this.hasInit) return;
    this.hasInit = true;
    const stage = process.env.NEXT_STAGE || process.env.NEXT_PUBLIC_STAGE || "dev";

    switch (stage) {
      case "staging": EnvironmentHelper.initStaging(); break;
      case "prod": EnvironmentHelper.initProd(); break;
      default: EnvironmentHelper.initDev(); break;
    }
    EnvironmentHelper.Common.init(stage);

    ApiHelper.apiConfigs = [
      { keyName: "MembershipApi", url: EnvironmentHelper.Common.MembershipApi, jwt: "", permissions: [] },
      { keyName: "AttendanceApi", url: EnvironmentHelper.Common.AttendanceApi, jwt: "", permissions: [] },
      { keyName: "MessagingApi", url: EnvironmentHelper.Common.MessagingApi, jwt: "", permissions: [] },
      { keyName: "ContentApi", url: EnvironmentHelper.Common.ContentApi, jwt: "", permissions: [] },
      { keyName: "GivingApi", url: EnvironmentHelper.Common.GivingApi, jwt: "", permissions: [] },
      { keyName: "DoingApi", url: EnvironmentHelper.Common.DoingApi, jwt: "", permissions: [] }
    ];
  };

  static initDev = () => {
    this.initStaging();
  };

  static initStaging = () => {
    // Staging API URLs are set in CommonEnvironmentHelper
  };

  static initProd = () => {
    //EnvironmentHelper.Common.GoogleAnalyticsTag = "G-XYCPBKWXB5";
  };
}
