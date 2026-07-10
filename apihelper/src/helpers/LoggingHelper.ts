import winston from "winston";
import WinstonCloudWatch from "winston-cloudwatch";
//import AWS from "aws-sdk";
import { EnvironmentBase } from "./EnvironmentBase.js";

export class LoggingHelper {
  private static _current: LoggingHelper | null = null;
  public static getCurrent = () => {
    if (!LoggingHelper._current) {
      const current = new LoggingHelper();
      current.init("API");
      LoggingHelper._current = current;
    }
    return LoggingHelper._current;
  };

  private _logger: winston.Logger | null = null;
  private wc?: WinstonCloudWatch;
  private pendingMessages = false;
  private logGroupName = EnvironmentBase.appName + "_" + EnvironmentBase.appEnv;
  private logDestination = "console";

  public error(msg: string | object) {
    throw msg instanceof Error ? msg : new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  public info(msg: string | object) {
    if (this._logger === null) this.init("API");
    this.pendingMessages = true;
    this._logger!.info(msg);
  }

  public log(streamName: string, level: string, msg: string | object) {
    if (this._logger === null) this.init(streamName);
    this.pendingMessages = true;
    if (level === "info") this._logger!.info(msg);
    else this._logger!.error(msg);
  }

  private init(streamName: string) {
    this.pendingMessages = false;
    //AWS.config.update({ region: "us-east-2" });
    if (EnvironmentBase.appEnv === "staging") this.logDestination = "cloudwatch";
    else if (EnvironmentBase.appEnv === "prod") this.logDestination = "cloudwatch";

    if (this.logDestination === "cloudwatch") {
      this.wc = new WinstonCloudWatch({ logGroupName: this.logGroupName, logStreamName: streamName, name: this.logGroupName + "_" + streamName });
      this._logger = winston.createLogger({ transports: [this.wc], format: winston.format.json() });
    } else this._logger = winston.createLogger({ transports: [new winston.transports.Console()], format: winston.format.json() });
    this._logger.info("Logger initialized");
  }

  public flush() {
    const promise = new Promise((resolve) => {
      if (this.pendingMessages) {
        if (this.wc) {
          this.wc.kthxbye(() => {
            // this._logger = null;
            this.pendingMessages = false;
          });
        }
        resolve(null);
      } else resolve(null);
    });
    return promise;
  }

}
