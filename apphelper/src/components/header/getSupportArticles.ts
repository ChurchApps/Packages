type SupportArticleParams = {
  appName: string;
  primaryMenuLabel: string;
  secondaryMenuLabel: string;
};

export const getSupportArticles = ({ appName, primaryMenuLabel, secondaryMenuLabel }: SupportArticleParams): string[] => {
  let result: string[] = [];
  if (appName === "B1Admin") {
    if (primaryMenuLabel === "People") {
      if (secondaryMenuLabel === "People") {
        result = [
          "docs/b1-admin/people/adding-people",
          "docs/b1-admin/people/searching-people",
          "docs/b1-admin/people/roles-permissions"
        ];
      } else if (secondaryMenuLabel === "Groups") result = ["docs/b1-admin/groups/group-members", "docs/b1-admin/groups", "docs/b1-admin/groups/group-calendar"];
      else if (secondaryMenuLabel === "Attendance") result = ["docs/b1-admin/attendance/", "docs/b1-admin/attendance/check-in"];
    } else if (primaryMenuLabel === "Donations") {
      if (secondaryMenuLabel === "Summary") result = ["docs/b1-admin/donations/donation-reports"];
      else if (secondaryMenuLabel === "Batches" || secondaryMenuLabel === "Funds") result = ["docs/b1-admin/donations/", "docs/b1-admin/donations/recording-donations"];
    } else if (primaryMenuLabel === "Serving") {
      if (secondaryMenuLabel === "Plans") result = ["docs/b1-admin/serving/plans"];
      else if (secondaryMenuLabel === "Tasks") result = ["docs/b1-admin/serving/tasks", "docs/b1-admin/serving/automations"];
    } else if (primaryMenuLabel === "Settings") {
      if (secondaryMenuLabel === "Settings") result = ["docs/b1-admin/settings/roles-permissions", "docs/b1-admin/people/exporting-data", "docs/b1-admin/people/importing-data#importing-from-csv", "docs/b1-admin/people/importing-data#importing-from-breeze-chms"];
      else if (secondaryMenuLabel === "Forms") result = ["docs/b1-admin/forms/"];
    }
  } else if (appName === "B1") {
    if (primaryMenuLabel === "Mobile App") result = ["docs/b1-admin/settings/mobile-app", "docs/b1-church/getting-started/installing-pwa"];
    else if (primaryMenuLabel === "Website") result = ["docs/b1-admin/website/initial-setup", "docs/b1-admin/website/page-editor", "docs/b1-admin/website/managing-pages"];
    else if (primaryMenuLabel === "Sermons") result = ["docs/b1-admin/sermons/managing-sermons", "docs/b1-admin/sermons/live-streaming"];
    else if (primaryMenuLabel === "Calendars") result = ["docs/b1-admin/calendars/creating-calendars"];
  }
  return result;
};
