import { CommonEnvironmentHelper, ApiHelper } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";

declare global {
	interface ImportMeta {
		readonly env: {
			readonly VITE_STAGE?: string;
			readonly MODE: string;
			readonly VITE_CONTENT_API?: string;
			readonly VITE_MESSAGING_API?: string;
			readonly VITE_MESSAGING_API_SOCKET?: string;
			readonly VITE_MEMBERSHIP_API?: string;
			readonly VITE_GIVING_API?: string;
		}
	}
}

export class EnvironmentHelper {
  static Common = CommonEnvironmentHelper;

  static init = async () => {
    let stage = import.meta.env.VITE_STAGE;
    if (stage === undefined) stage = import.meta.env.MODE;
    console.log(`Environment stage: ${stage}`);

    EnvironmentHelper.Common.init(stage || "dev");

    switch (stage) {
      case "production":
      case "prod":
        EnvironmentHelper.initProd();
        break;
      case "staging":
        EnvironmentHelper.initStaging();
        break;
      default:
        EnvironmentHelper.initDev();
        break;
    }

    EnvironmentHelper.populateConfigs();
    await Locale.init([]);
  };

  static initDev = () => {
    // Use staging values as defaults, then override with local development URLs if provided
    EnvironmentHelper.initStaging();

    if (import.meta.env.VITE_CONTENT_API) EnvironmentHelper.Common.ContentApi = import.meta.env.VITE_CONTENT_API;
    if (import.meta.env.VITE_MESSAGING_API) {
      EnvironmentHelper.Common.MessagingApi = import.meta.env.VITE_MESSAGING_API;
      EnvironmentHelper.Common.MessagingApiSocket = import.meta.env.VITE_MESSAGING_API_SOCKET || "ws://localhost:8087";
    }
    if (import.meta.env.VITE_MEMBERSHIP_API) {
      EnvironmentHelper.Common.MembershipApi = import.meta.env.VITE_MEMBERSHIP_API;
    }
    if (import.meta.env.VITE_GIVING_API) {
      EnvironmentHelper.Common.GivingApi = import.meta.env.VITE_GIVING_API;
    }

    console.log("🔧 Development environment configured:");
    console.log("   ContentApi:", EnvironmentHelper.Common.ContentApi);
    console.log("   MessagingApi:", EnvironmentHelper.Common.MessagingApi);
    console.log("   MembershipApi:", EnvironmentHelper.Common.MembershipApi);
    console.log("   GivingApi:", EnvironmentHelper.Common.GivingApi);
  };

  static initStaging = () => {
    // No specific staging configuration needed
  };

  static initProd = () => {
    EnvironmentHelper.Common.GoogleAnalyticsTag = "G-P63T3JN4VE";
  };

  static populateConfigs = () => {
    ApiHelper.apiConfigs = [
      { keyName: "AttendanceApi", url: EnvironmentHelper.Common.AttendanceApi, jwt: "", permissions: [] },
      { keyName: "GivingApi", url: EnvironmentHelper.Common.GivingApi, jwt: "", permissions: [] },
      { keyName: "MembershipApi", url: EnvironmentHelper.Common.MembershipApi, jwt: "", permissions: [] },
      { keyName: "MessagingApi", url: EnvironmentHelper.Common.MessagingApi, jwt: "", permissions: [] },
      { keyName: "ReportingApi", url: EnvironmentHelper.Common.ReportingApi, jwt: "", permissions: [] },
      { keyName: "DoingApi", url: EnvironmentHelper.Common.DoingApi, jwt: "", permissions: [] },
      { keyName: "ContentApi", url: EnvironmentHelper.Common.ContentApi, jwt: "", permissions: [] },
      { keyName: "AskApi", url: EnvironmentHelper.Common.AskApi, jwt: "", permissions: [] }
    ];

    console.log("📡 API Configs populated:");
    ApiHelper.apiConfigs.forEach((config: any) => {
      console.log(`   ${config.keyName}: ${config.url}`);
    });
  };

}
