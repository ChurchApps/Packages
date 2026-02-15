export class BasePermissions {
  static forms = {
    admin: { contentType: "Forms", action: "Admin" },
    edit: { contentType: "Forms", action: "Edit" }
  };
  static links = { edit: { contentType: "Links", action: "Edit" } };
  static pages = { edit: { contentType: "Pages", action: "Edit" } };
  static settings = { edit: { contentType: "Settings", action: "Edit" } };
}
