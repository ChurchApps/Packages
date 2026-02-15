import { interfaces } from "inversify-express-utils";

export interface PrincipalDetails {
  jwt?: string;
  id?: string;
  churchId?: string;
  permissions?: string[];
  apiName?: string;
  email?: string;
  personId?: string;
  firstName?: string;
  lastName?: string;
  membershipStatus?: string;
  groupIds?: string[];
  leaderGroupIds?: string[];
  [key: string]: unknown;
}

export class Principal implements interfaces.Principal {
  public details: PrincipalDetails;

  public constructor(details: PrincipalDetails) {
    this.details = details;
  }

  public isAuthenticated(): Promise<boolean> {
    return Promise.resolve(true);
  }

  public isResourceOwner(resourceId: string | number): Promise<boolean> {
    return Promise.resolve(resourceId === 1111);
  }

  public isInRole(role: string): Promise<boolean> {
    return Promise.resolve(role === "admin");
  }

}
