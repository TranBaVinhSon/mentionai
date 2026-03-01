import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { WinstonLogger } from "../common/logger/winston.logger";

// List of sensitive field names to filter out
const SENSITIVE_FIELDS = [
  "password",
  "pass",
  "passwd",
  "pwd",
  "secret",
  "token",
  "key",
  "apikey",
  "api_key",
  "access_token",
  "refresh_token",
  "auth",
  "authorization",
  "credential",
  "private",
  "priv",
  "cert",
  "certificate",
  "ssn",
  "social_security",
  "credit_card",
  "card_number",
  "cvv",
  "cvc",
  "pin",
];

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly nodeEnv: string;
  private readonly disableRequestLogger: boolean;
  private readonly logger: WinstonLogger;

  constructor(private readonly configService: ConfigService) {
    this.nodeEnv = this.configService.get("node_env");
    this.disableRequestLogger = this.configService.get("disable_request_logger") || false;
    this.logger = new WinstonLogger("HTTP");
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    const requestUrl = req.originalUrl || req.url;

    // Skip health check endpoints
    if (requestUrl && requestUrl.includes("/healthz")) {
      next();
      return;
    }

    // Check if request should be logged
    const shouldLog = this.shouldLogRequest(requestUrl);

    // Skip logging if disabled by config and not a priority endpoint
    if (this.disableRequestLogger && !shouldLog) {
      next();
      return;
    }

    // In production, only log priority endpoints (completions and apps)
    if (this.nodeEnv === "production" && !shouldLog) {
      next();
      return;
    }

    // Filter sensitive data from headers - include more comprehensive headers for production debugging
    const filteredHeaders = this.filterSensitiveData({
      host: req.headers.host,
      userAgent: req.headers["user-agent"],
      contentType: req.headers["content-type"],
      contentLength: req.headers["content-length"],
      origin: req.headers.origin,
      referer: req.headers.referer,
      accept: req.headers.accept,
      acceptLanguage: req.headers["accept-language"],
      acceptEncoding: req.headers["accept-encoding"],
      authorization: req.headers.authorization, // Will be redacted by filterSensitiveData
      xForwardedFor: req.headers["x-forwarded-for"],
      xRealIp: req.headers["x-real-ip"],
      xRequestId: req.headers["x-request-id"],
      connection: req.headers.connection,
      cacheControl: req.headers["cache-control"],
    });

    // Filter sensitive data from body and query
    const filteredBody = req.body ? this.filterSensitiveData(req.body) : undefined;
    const filteredQuery = req.query ? this.filterSensitiveData(req.query) : undefined;

    // Log message with environment context
    const logPrefix = this.nodeEnv === "production" ? "[PROD]" : "[DEV]";
    this.logger.log(`${logPrefix} Request: ${req.method} ${requestUrl}`, {
      environment: this.nodeEnv,
      ip: req.ip,
      ips: req.ips,
      headers: filteredHeaders,
      body: filteredBody,
      query: filteredQuery,
      timestamp: new Date().toISOString(),
    });

    next();
  }

  private shouldLogRequest(requestUrl: string): boolean {
    if (!requestUrl) return false;

    // Log requests to completions and apps endpoints (including internal API paths)
    return (
      requestUrl.includes("/completions") ||
      requestUrl.includes("/apps") ||
      requestUrl.includes("/internal/api/v1/completions") ||
      requestUrl.includes("/internal/api/v1/apps")
    );
  }

  private filterSensitiveData(data: any): any {
    if (!data || typeof data !== "object") return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.filterSensitiveData(item));
    }

    const filtered: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field));

      if (isSensitive) {
        filtered[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        filtered[key] = this.filterSensitiveData(value);
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }
}
