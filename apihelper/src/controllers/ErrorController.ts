import { controller, httpPost } from "inversify-express-utils";
import express from "express";
import { CustomBaseController } from "./CustomBaseController.js";
import { ErrorLog } from "../models/index.js";

@controller("/errors")
export class ErrorController extends CustomBaseController {

  @httpPost("/")
  public async save(req: express.Request<{}, {}, ErrorLog[]>, _res: express.Response): Promise<ErrorLog[]> {
    req.body.forEach(error => {
      let fullMessage = error.message || "";
      if (error.additionalDetails !== undefined) fullMessage += "\n" + error.additionalDetails;
      this.logger.log(error.application || "unknown", error.level || "error", fullMessage);
    });
    await this.logger.flush();
    return req.body;

  }

}
