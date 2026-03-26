import { Module } from "@nestjs/common";
import { S3HandlerService } from "./s3-handler.service";

@Module({
  imports: [],
  controllers: [],
  providers: [S3HandlerService],
  exports: [S3HandlerService],
})
export class S3HandlerModule {}
