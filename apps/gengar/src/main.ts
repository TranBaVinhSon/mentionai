import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import express from "express";
import { NestExpressApplication } from "@nestjs/platform-express";
import { RollbarExceptionFilter } from "./config/rollbar-exception.filter";
import { ROLLBAR_TOKEN } from "./config/rollbar.provider";
import { WinstonLogger } from "./common/logger/winston.logger";
import { LoggerMiddleware } from "./middleware/logger.middleware";
import { BlacklistMiddleware } from "./middleware/blacklist.middleware";

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      rawBody: true,
      logger: new WinstonLogger(),
    });

    const configService = app.get(ConfigService);

    const nodeEnv = configService.get("node_env");

    // app.use(
    //   compression({
    //     filter: (req, res) => {
    //       if (req.headers["accept"] === "text/event-stream") {
    //         return false;
    //       }
    //       return compression.filter(req, res);
    //     },
    //   })
    // );
    // Get the underlying Express instance
    // const expressApp = app.getHttpAdapter().getInstance();

    // Disable etag
    // expressApp.set("etag", false);

    app.use(
      express.json({
        verify: (req: any, res, buf) => {
          req.rawBody = buf;
        },
        limit: "50mb",
      }),
    );
    app.use(express.raw({ type: "*/*", limit: "50mb" }));
    app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // Apply logger middleware after body parsing
    const loggerMiddleware = new LoggerMiddleware(configService);
    app.use(loggerMiddleware.use.bind(loggerMiddleware));

    // Apply blacklist middleware to block malicious users
    const blacklistMiddleware = new BlacklistMiddleware(configService);
    app.use(blacklistMiddleware.use.bind(blacklistMiddleware));

    // if (nodeEnv === "production") {
    //   // TODO: Uncomment this when we have a production domain
    //   // const allowlist = [
    //   //   "https://mentionai.io",
    //   //   "https://www.mentionai.io",
    //   //   "https://api.mentionai.io",
    //   //   "https://www.api.mentionai.io",
    //   // ];

    //   // app.enableCors({
    //   //   origin: allowlist,
    //   //   exposedHeaders: ["x-services-version"],
    //   // });

    //   app.enableCors({ exposedHeaders: ["x-services-version"] });
    // } else {
    //   app.enableCors({ exposedHeaders: ["x-services-version"] });
    // }

    app.enableCors();

    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    // Get Rollbar instance and apply exception filter
    const rollbar = app.get(ROLLBAR_TOKEN);
    app.useGlobalFilters(new RollbarExceptionFilter(rollbar));

    if (nodeEnv !== "production") {
      const internalApiOptions = new DocumentBuilder()
        .setTitle("Gengar API")
        .setDescription("Gengar API Description")
        .setVersion("1.0")
        .addBearerAuth()
        .build();
      const internalApiDocument = SwaggerModule.createDocument(app, internalApiOptions);
      SwaggerModule.setup("api/docs/v1", app, internalApiDocument);
    }

    const port = configService.get("port");
    await app.listen(port, "0.0.0.0");
  } catch (error) {
    console.error("Failed to start the application:", JSON.stringify(error, null, 2));
  }
}

bootstrap().catch((error) => {
  console.error("Failed to start the application:", JSON.stringify(error, null, 2));
});
