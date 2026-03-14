import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import nodemailer from "nodemailer";
// Removed nodemailer-direct-transport due to security vulnerabilities
import { EnvironmentBase } from "./EnvironmentBase.js";
import { IEmailPayload } from "./Interfaces.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailHelper {

  private static getSESClient(): SESClient {
    return new SESClient({ region: "us-east-2" });
  }

  public static async sendTemplatedEmail(from: string, to: string, appName: string, appUrl: string, subject: string, contents: string, emailTemplate: "EmailTemplate.html" | "ChurchEmailTemplate.html" = "EmailTemplate.html", replyTo?: string) {
    if (!appName) appName = "B1";
    if (!appUrl) appUrl = "https://b1.church";

    const template = EmailHelper.readTemplate(emailTemplate);
    const emailBody = template
      .replace("{appLink}", "<a target='_blank' rel='noreferrer noopener' href=\"" + appUrl + "/\">" + appName + "</a>")
      .replace("{contents}", contents);
    await EmailHelper.sendEmail({ from, to, subject, body: emailBody, replyTo });
  }

  public static readTemplate(templateFile?: string) {
    if (!templateFile) templateFile = "EmailTemplate.html";
    // Try dist/templates first (npm-published package), then fall back to src/tools/templates (local dev)
    const distPath = path.join(__dirname, "../templates/" + templateFile);
    const srcPath = path.join(__dirname, "../../src/tools/templates/" + templateFile);
    const filePath = fs.existsSync(distPath) ? distPath : srcPath;
    const buffer = fs.readFileSync(filePath);
    const contents = buffer.toString();
    return contents;
  }

  private static async sendSes({ from, to, subject, body, replyTo }: IEmailPayload) {
    const sesClient = this.getSESClient();
    const sendCommand = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: body
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject
        }
      },
      Source: from,
      ReplyToAddresses: replyTo ? [replyTo] : undefined
    });
    await sesClient.send(sendCommand);
  }

  public static async sendEmail({ from, to, subject, body, replyTo }: IEmailPayload): Promise<void> {
    try {
      // Use a safer fallback - streamline transport (for testing/dev) or require proper SMTP config
      let transporter: nodemailer.Transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: "unix",
        buffer: true
      });

      if (EnvironmentBase.mailSystem === "SES") {
        await this.sendSes({ from, to, subject, body, replyTo });
      } else {
        if (EnvironmentBase.mailSystem === "SMTP") {
          transporter = nodemailer.createTransport({
            host: EnvironmentBase.smtpHost,
            secure: EnvironmentBase.smtpSecure,
            auth: {
              user: EnvironmentBase.smtpUser,
              pass: EnvironmentBase.smtpPass
            }
          });
        }

        if (EnvironmentBase.mailSystem === "") {
          console.log("****Email server not configured: ");
          console.log(subject);
          console.log(body);
        } else {
          await transporter.sendMail({ from, to, subject, html: body, replyTo });
        }
      }
      return null;
    } catch (err) {
      throw err;
    }
  }

}
