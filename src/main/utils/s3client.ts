import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import fs from "fs";
import { Readable } from "stream";

interface S3ClientConfig {
  accountId?: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

export function createS3Client({ accountId, accessKeyId, secretAccessKey, region = "auto" }: S3ClientConfig): S3Client {
  return new S3Client({
    region,
    endpoint: accountId
      ? `https://${accountId}.r2.cloudflarestorage.com` // R2
      : undefined,                                     // AWS 默认
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

type S3Method = "PUT" | "GET" | "DELETE";

interface S3ActionResult {
  success: boolean;
  message: string;
}

/**
 * 通用 S3 操作
 * @param {S3Client} s3 - 已创建的 S3Client
 * @param {string} bucket - 存储桶名称
 * @param {string} key - 对象 Key
 * @param {string} method - "PUT" | "GET" | "DELETE"
 * @param {string|null} filePath - 本地文件路径 (PUT/GET 需要)
 */
export async function s3Action(
  s3: S3Client,
  bucket: string,
  key: string,
  method: S3Method = "GET",
  filePath: string | null = null
): Promise<S3ActionResult> {
  switch (method.toUpperCase()) {
    case "PUT": {
      if (!filePath) throw new Error("filePath is required for PUT");
      const fileStream = fs.createReadStream(filePath);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileStream
      }));
      return { success: true, message: `Uploaded: s3://${bucket}/${key}` };
    }

    case "GET": {
      if (!filePath) throw new Error("filePath is required for GET");
      const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const stream = res.Body as Readable;
      if (!stream) throw new Error("No body in S3 response");
      return new Promise<S3ActionResult>((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        stream.on("end", () => resolve({ success: true, message: `Downloaded to ${filePath}` }));
        stream.on("error", reject);
        writeStream.on("error", reject);
      });
    }

    case "DELETE": {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return { success: true, message: `Deleted: s3://${bucket}/${key}` };
    }

    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
