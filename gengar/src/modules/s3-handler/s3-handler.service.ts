import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as AWS from "aws-sdk";

@Injectable()
export class S3HandlerService {
  private s3: AWS.S3;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get<string>("aws.accessKeyId") || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: this.configService.get<string>("aws.secretAccessKey") || process.env.AWS_SECRET_ACCESS_KEY,
      region: this.configService.get<string>("aws.region") || process.env.AWS_REGION,
    });
  }

  async uploadFile(file: Buffer, contentType: string, key: string): Promise<string> {
    const params = {
      Bucket: this.configService.get<string>("aws.s3BucketName") || process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    };

    const uploadResult = await this.s3.upload(params).promise();
    return uploadResult.Key;
  }
  async generateSignedUrl(
    key: string,
    expirationTime = 3600, // 1 hour
  ): Promise<string> {
    const params = {
      Bucket: this.configService.get<string>("aws.s3BucketName") || process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Expires: expirationTime,
    };

    return await this.s3.getSignedUrlPromise("getObject", params);
  }
}
