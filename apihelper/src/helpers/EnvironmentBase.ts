import fs from "fs";
import path from "path";
import { AwsHelper } from "./AwsHelper.js";

export interface EnvironmentInitOptions {
  appName: string;
  /** Directory containing dev.json/staging.json/prod.json. Defaults to <cwd>/config, which is correct both locally and in Lambda (/var/task/config). */
  configDir?: string;
  /** Extra environment-name → file mappings beyond dev/demo/staging/prod (e.g. { selfhost: "selfhost.json" }). */
  fileMap?: Record<string, string>;
}

const ENV_FILES: Record<string, string> = {
  dev: "dev.json",
  demo: "demo.json",
  staging: "staging.json",
  prod: "prod.json"
};

export class EnvironmentBase {
  static appEnv: string;
  static appName: string;
  static s3Bucket: string;
  static connectionString: string;
  static contentRoot: string;
  static encryptionKey: string;
  static fileStore: string;
  static jwtSecret: string;

  static mailSystem: string;
  static smtpHost: string;
  static smtpPass: string;
  static smtpSecure: boolean;
  static smtpUser: string;

  /** Loads config/<env>.json and enables subclass field extension. */
  static async initBase(environment: string, options: EnvironmentInitOptions): Promise<Record<string, any>> {
    const env = environment.toLowerCase();
    const files = { ...ENV_FILES, ...options.fileMap };
    const file = files[env] || "dev.json";
    const configDir = options.configDir || path.resolve(process.cwd(), "config");
    const json = fs.readFileSync(path.resolve(configDir, file), "utf8");
    const data = JSON.parse(json);
    await this.populateBase(data, options.appName, env);
    return data;
  }

  static async populateBase(jsonData: Record<string, unknown>, appName: string, appEnv: string) {
    EnvironmentBase.appName = jsonData.appName as string;
    EnvironmentBase.appEnv = jsonData.appEnv as string;
    EnvironmentBase.connectionString = process.env.CONNECTION_STRING || await AwsHelper.readParameter(`/${appEnv}/${appName}/connectionString`);
    EnvironmentBase.contentRoot = jsonData.contentRoot as string;
    EnvironmentBase.encryptionKey = process.env.ENCRYPTION_KEY || await AwsHelper.readParameter(`/${appEnv}/encryptionKey`);
    EnvironmentBase.fileStore = jsonData.fileStore as string;
    EnvironmentBase.jwtSecret = process.env.JWT_SECRET || await AwsHelper.readParameter(`/${appEnv}/jwtSecret`);
    EnvironmentBase.mailSystem = jsonData.mailSystem as string;
    EnvironmentBase.s3Bucket = jsonData.s3Bucket as string;
    EnvironmentBase.smtpHost = process.env.SMTP_HOST;
    EnvironmentBase.smtpPass = process.env.SMTP_PASS;
    EnvironmentBase.smtpSecure = process.env.SMTP_SECURE === "true";
    EnvironmentBase.smtpUser = process.env.SMTP_USER;
  }

}
