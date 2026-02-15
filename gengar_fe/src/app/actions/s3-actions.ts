"use server";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFile(
  userId: number | undefined,
  formData: FormData
): Promise<{
  s3Link: string;
  s3Key: string;
}> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file provided");
    }

    const fileBuffer = await file.arrayBuffer();
    const fileName = `${uuidv4()}`;
    const key = `${userId}/uploads/images/${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: Buffer.from(fileBuffer),
        ContentType: file.type,
      })
    );

    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 600, // 10 minutes in seconds
    });

    return {
      s3Link: url,
      s3Key: key,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
}

export async function deleteFile(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}
