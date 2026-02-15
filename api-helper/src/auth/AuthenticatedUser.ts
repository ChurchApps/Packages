import { Principal } from "./Principal.js";
import { IPermission } from "../helpers/Interfaces.js";

export class AuthenticatedUser {
  public id: string;
  public churchId: string;
  public email: string;
  public apiName: string;
  public permissions: string[];
  public personId: string;
  public firstName: string;
  public lastName: string;
  public membershipStatus?: string;
  public groupIds?: string[];
  public leaderGroupIds?: string[];
  public jwt: string;

  public constructor(principal: Principal) {
    this.jwt = principal.details.jwt || "";
    this.id = principal.details.id || "";
    this.churchId = principal.details.churchId || "";
    this.permissions = principal.details.permissions || [];
    this.apiName = principal.details.apiName || "";
    this.email = principal.details.email || "";
    this.personId = principal.details.personId || "";
    this.firstName = principal.details.firstName || "";
    this.lastName = principal.details.lastName || "";
    this.membershipStatus = principal.details.membershipStatus;
    this.groupIds = principal.details.groupIds || [];
    this.leaderGroupIds = principal.details.leaderGroupIds || [];
  }

  public checkAccess(permission: IPermission) {
    const key = (permission.apiName)
      ? permission.apiName + "_" + permission.contentType + "__" + permission.action
      : permission.contentType + "__" + permission.action;

    let result = false;
    this.permissions?.forEach((p: string) => {
      if (p === key) result = true;
    });
    return result;
  }
}
