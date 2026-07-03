export class Permissions {
  static attendanceApi = {
    attendance: {
      view: { api: "AttendanceApi", contentType: "Attendance", action: "View" },
      viewSummary: {
        api: "AttendanceApi",
        contentType: "Attendance",
        action: "View Summary"
      },
      edit: { api: "AttendanceApi", contentType: "Attendance", action: "Edit" },
      checkin: { api: "AttendanceApi", contentType: "Attendance", action: "Checkin" }
    },
    services: { edit: { api: "AttendanceApi", contentType: "Services", action: "Edit" } }
  };

  static membershipApi = {
    roles: {
      view: { api: "MembershipApi", contentType: "Roles", action: "View" },
      edit: { api: "MembershipApi", contentType: "Roles", action: "Edit" }
    },
    settings: { edit: { api: "MembershipApi", contentType: "Settings", action: "Edit" } },
    server: { admin: { api: "MembershipApi", contentType: "Server", action: "Admin" } },
    forms: {
      admin: { api: "MembershipApi", contentType: "Forms", action: "Admin" },
      edit: { api: "MembershipApi", contentType: "Forms", action: "Edit" }
    },
    groups: { edit: { api: "MembershipApi", contentType: "Groups", action: "Edit" } },
    people: {
      view: { api: "MembershipApi", contentType: "People", action: "View" },
      viewMembers: {
        api: "MembershipApi",
        contentType: "People",
        action: "View Members"
      },
      edit: { api: "MembershipApi", contentType: "People", action: "Edit" }
    },
    plans: { edit: { api: "MembershipApi", contentType: "Plans", action: "Edit" } },
    groupMembers: {
      edit: {
        api: "MembershipApi",
        contentType: "Group Members",
        action: "Edit"
      },
      view: {
        api: "MembershipApi",
        contentType: "Group Members",
        action: "View"
      }
    }
  };

  static givingApi = {
    donations: {
      viewSummary: {
        api: "GivingApi",
        contentType: "Donations",
        action: "View Summary"
      },
      view: { api: "GivingApi", contentType: "Donations", action: "View" },
      edit: { api: "GivingApi", contentType: "Donations", action: "Edit" }
    },
    settings: {
      view: { api: "GivingApi", contentType: "Settings", action: "View" },
      edit: { api: "GivingApi", contentType: "Settings", action: "Edit" }
    }
  };

  static messagingApi = { texting: { send: { api: "MessagingApi", contentType: "Texting", action: "Send" } } };

  static doingApi = {
    tasks: {
      view: { api: "DoingApi", contentType: "Tasks", action: "View" },
      edit: { api: "DoingApi", contentType: "Tasks", action: "Edit" },
      admin: { api: "DoingApi", contentType: "Tasks", action: "Admin" }
    }
  };

  static contentApi = {
    chat: { host: { api: "ContentApi", contentType: "Chat", action: "Host" } },
    content: { edit: { api: "ContentApi", contentType: "Content", action: "Edit" } },
    streamingServices: {
      edit: {
        api: "ContentApi",
        contentType: "StreamingServices",
        action: "Edit"
      }
    }
  };
}
