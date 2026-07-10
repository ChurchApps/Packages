import { S3Client, S3ClientConfig, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command, ListObjectsV2Output } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { EnvironmentBase } from "./EnvironmentBase.js";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

export class AwsHelper {

  //Pulls from AWS SSM Parameter Store
  static async readParameter(parameterName: string): Promise<string> {
    let result = "";
    try {
      const ssm = new SSMClient({ region: process.env.AWS_REGION || "us-east-2" });
      const params = { Name: parameterName, WithDecryption: true };
      const command = new GetParameterCommand(params);
      const response = await ssm.send(command);
      result = response?.Parameter?.Value || "";
    } catch {
      result = "";
    }
    return result;
  }

  private static _client: S3Client;

  private static getS3Config(): S3ClientConfig {
    const config: S3ClientConfig = {};
    if (process.env.S3_ENDPOINT) {
      config.endpoint = process.env.S3_ENDPOINT;
      config.forcePathStyle = true;
    }
    return config;
  }

  private static getClient(): S3Client {
    if (!this._client) {
      this._client = new S3Client(this.getS3Config());
    }
    return this._client;
  }

  static async S3PresignedUrl(key: string): Promise<{url: string, fields: Record<string, string>, key: string}> {
    if (key.startsWith("/")) key = key.substring(1);
    const { url, fields } = await createPresignedPost(this.getClient(), {
      Bucket: EnvironmentBase.s3Bucket,
      Key: key,
      Conditions: [
        ["starts-with", "$Content-Type", ""],
        { acl: "public-read" }
      ],
      Expires: 3600 // 1 hour
    });
    return { url, fields, key };
  }

  static async S3Upload(key: string, contentType: string, contents: Buffer): Promise<void> {
    if (key.startsWith("/")) key = key.substring(1);
    const command = new PutObjectCommand({
      Bucket: EnvironmentBase.s3Bucket,
      Key: key,
      Body: contents,
      ACL: "public-read",
      ContentType: contentType
    });
    await this.getClient().send(command);
  }

  static async S3Remove(key: string): Promise<void> {
    if (key.startsWith("/")) key = key.substring(1);
    const command = new DeleteObjectCommand({
      Bucket: EnvironmentBase.s3Bucket,
      Key: key
    });
    await this.getClient().send(command);
  }

  static async S3Rename(oldKey: string, newKey: string): Promise<void> {
    console.log(`Renaming: ${oldKey} to ${newKey}`);
    await this.S3Copy(oldKey, newKey);
    await this.S3Remove(oldKey);
  }

  static S3Move(oldKey: string, newKey: string): Promise<void> {
    return this.S3Rename(oldKey, newKey);
  }

  static async S3Copy(oldKey: string, newKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: EnvironmentBase.s3Bucket,
      CopySource: `/${EnvironmentBase.s3Bucket}/${oldKey}`,
      Key: newKey,
      ACL: "public-read"
    });
    await this.getClient().send(command);
  }

  static async S3List(path: string): Promise<string[]> {
    return this.S3ListMultiPage(this.getClient(), EnvironmentBase.s3Bucket, path);
  }

  static async S3ListMultiPage(s3: S3Client, bucket: string, path: string): Promise<string[]> {
    const result: string[] = [];
    let continuationToken: string | undefined;

    do {
      const { Contents, NextContinuationToken } = await this.S3ListManual(s3, bucket, path, continuationToken);
      result.push(...(Contents?.map((item) => item.Key).filter((key): key is string => key !== undefined) || []));
      continuationToken = NextContinuationToken;
    } while (continuationToken);

    return result;
  }

  private static async S3ListManual(s3: S3Client, bucket: string, path: string, continuationToken?: string): Promise<ListObjectsV2Output> {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: path,
      MaxKeys: 10000,
      ContinuationToken: continuationToken
    });
    return s3.send(command);
  }

  static async S3Read(key: string): Promise<string | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: EnvironmentBase.s3Bucket,
        Key: key
      });
      const response = await this.getClient().send(command);
      return (await response.Body?.transformToString()) ?? null;
    } catch (error) {
      console.error("Error reading from S3:", error);
      return null;
    }
  }

}
