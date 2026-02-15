import { BaseHttpController } from "inversify-express-utils";
import express from "express";
import { LoggingHelper } from "../helpers/LoggingHelper.js";
import { AuthenticatedUser, Principal } from "../auth/index.js";

export class CustomBaseController extends BaseHttpController {

  public logger: LoggingHelper;

  constructor() {
    super();
    this.logger = LoggingHelper.getCurrent();
  }

  public error(errors: string[]) {
    return this.json({ errors }, 500);
  }

  public denyAccess(errors: string[]) {
    return this.json({ errors }, 401);
  }

  public authUser(): AuthenticatedUser {
    if (this.httpContext.user === null) return new AuthenticatedUser(new Principal({}));
    else return new AuthenticatedUser(this.httpContext.user as Principal);
  }

  public include(req: express.Request, item: string) {
    let result = false;
    if (req.query.include !== undefined) {
      const value: string = req.query.include as string;
      const items = value.split(",");
      if (items.indexOf(item) > -1) result = true;
    }
    return result;
  }

  public async actionWrapper(_req: express.Request, _res: express.Response, fetchFunction: (_au: AuthenticatedUser) => unknown): Promise<unknown> {
    try {
      const result = await fetchFunction(this.authUser());
      await this.logger.flush();
      return result;
    } catch (e: unknown) {
      // Since logger.error now throws, just re-throw the error
      throw e;
    }
  }

  public async actionWrapperAnon(_req: express.Request, _res: express.Response, fetchFunction: () => unknown): Promise<unknown> {
    try {
      const result = await fetchFunction();
      await this.logger.flush();
      return result;
    } catch (e: unknown) {
      // Since logger.error now throws, just re-throw the error
      throw e;
    }
  }

}
