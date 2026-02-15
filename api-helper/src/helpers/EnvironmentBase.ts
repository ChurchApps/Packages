import { AwsHelper } from "./AwsHelper.js";

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
