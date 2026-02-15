import crypto from "crypto";
import { EnvironmentBase } from "./EnvironmentBase.js";

export class EncryptionHelper {
  private static algorithm = "aes-256-ctr";

  static encrypt = (plainValue: string) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(EncryptionHelper.algorithm, EnvironmentBase.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainValue), cipher.final()]);
    return iv.toString("base64") + "|" + encrypted.toString("base64");
  };

  static decrypt = (encryptedPair: string) => {
    const parts = encryptedPair.split("|");
    if (parts.length !== 2) return "";
    else {
      const iv = Buffer.from(parts[0], "base64");
      const content = Buffer.from(parts[1], "base64");
      const decipher = crypto.createDecipheriv(EncryptionHelper.algorithm, EnvironmentBase.encryptionKey, iv);
      const decrpyted = Buffer.concat([decipher.update(content), decipher.final()]);
      return decrpyted.toString();
    }
  };
}
