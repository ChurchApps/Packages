import { injectable } from "inversify";
import { interfaces } from "inversify-express-utils";
import express from "express";
import { Principal } from "./Principal.js";
import { EnvironmentBase } from "../helpers/EnvironmentBase.js";
import { principalFromAuthorizationHeader } from "./principalFromHeader.js";

@injectable()
export class CustomAuthProvider implements interfaces.AuthProvider {
  // public async getUser(req: express.Request, res: express.Response, next: express.NextFunction): Promise<interfaces.Principal> {
  public async getUser(req: express.Request, _res: express.Response, _next: express.NextFunction): Promise<Principal> {
    return principalFromAuthorizationHeader(req.headers.authorization, EnvironmentBase.jwtSecret) as Principal;
  }
}
