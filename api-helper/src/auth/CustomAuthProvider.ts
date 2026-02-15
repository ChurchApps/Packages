import { injectable } from "inversify";
import { interfaces } from "inversify-express-utils";
import express from "express";
import jwt from "jsonwebtoken";
import { Principal } from "./Principal.js";
import { EnvironmentBase } from "../helpers/EnvironmentBase.js";

@injectable()
export class CustomAuthProvider implements interfaces.AuthProvider {
  // public async getUser(req: express.Request, res: express.Response, next: express.NextFunction): Promise<interfaces.Principal> {
  public async getUser(req: express.Request, _res: express.Response, _next: express.NextFunction): Promise<Principal> {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (!token) return null;
      const decoded = jwt.verify(token, EnvironmentBase.jwtSecret);

      const result = decoded ? new Principal(typeof decoded === "object" && decoded !== null ? decoded as Record<string, unknown> : {}) : null;
      if (result) result.details.jwt = token;
      return result;
    }

    return null;
  }
}
