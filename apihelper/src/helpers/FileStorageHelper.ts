import { AwsHelper } from "./AwsHelper.js";
import fs from "fs";
import path from "path";
import { EnvironmentBase } from "./EnvironmentBase.js";

export class FileStorageHelper {
  private static rootPath = path.resolve("./content") + "/";

  static list = async (filePath: string) => {
    let result = [];
    switch (EnvironmentBase.fileStore) {
      case "S3": result = await AwsHelper.S3List(filePath); break;
      default: result = await FileStorageHelper.listLocal(filePath); break;
    }
    return result;
  };

  static move = async (oldKey: string, newKey: string) => {
    switch (EnvironmentBase.fileStore) {
      case "S3": await AwsHelper.S3Move(oldKey, newKey); break;
      default: await FileStorageHelper.moveLocal(oldKey, newKey); break;
    }
  };

  static store = async (key: string, contentType: string, contents: Buffer) => {
    switch (EnvironmentBase.fileStore) {
      case "S3": await AwsHelper.S3Upload(key, contentType, contents); break;
      default: await FileStorageHelper.storeLocal(key, contents); break;
    }
  };

  static remove = async (key: string) => {
    switch (EnvironmentBase.fileStore) {
      case "S3": await AwsHelper.S3Remove(key); break;
      default: await FileStorageHelper.removeLocal(key); break;
    }
  };

  static removeFolder = async (key: string) => {
    switch (EnvironmentBase.fileStore) {
      case "S3": break; // no need on s3
      default: await FileStorageHelper.removeLocalFolder(key); break;
    }
  };

  private static storeLocal = async (key: string, contents: Buffer) => {
    const fileName = FileStorageHelper.rootPath + key;
    const dirName = path.dirname(fileName);
    if (!fs.existsSync(dirName)) fs.mkdirSync(dirName, { recursive: true });
    fs.writeFileSync(fileName, contents);
  };

  private static moveLocal = async (oldKey: string, newKey: string) => {
    fs.rename(oldKey, newKey, err => { throw err; });
  };

  private static removeLocal = async (key: string) => {
    fs.unlinkSync(FileStorageHelper.rootPath + key);
  };

  private static removeLocalFolder = async (key: string) => {
    fs.rmdirSync(FileStorageHelper.rootPath + key);
  };

  private static listLocal = async (filePath: string) => {
    const fullPath = FileStorageHelper.rootPath + filePath;
    if (!fs.existsSync(fullPath)) return [];
    else return fs.readdirSync(FileStorageHelper.rootPath + filePath);
  };

}
