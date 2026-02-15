import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { ROLLBAR_TOKEN } from "./rollbar.provider";
import Rollbar from "rollbar";

@Catch()
export class RollbarExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RollbarExceptionFilter.name);

  constructor(@Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : exception instanceof Error
        ? exception.message
        : String(exception);

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(process.env.NODE_ENV !== "production" && { error: message }),
    };

    if (status >= 500) {
      // Log before sending to Rollbar
      this.logger.log(
        `Preparing to send error to Rollbar - Status: ${status}, Path: ${request.url}, Method: ${request.method}`,
      );

      const rollbarData = {
        request: {
          url: request.url,
          method: request.method,
          headers: this.sanitizeHeaders(request.headers),
          ip: request.ip,
          route: request.route?.path,
          body: request.body,
          query: request.query,
          params: request.params,
        },
        custom: {
          errorMessage: message,
          errorType: exception.constructor?.name || "Unknown",
          statusCode: status,
          timestamp: new Date().toISOString(),
        },
      };

      this.rollbar.error(exception, rollbarData, (err: any, uuid: string) => {
        if (err) {
          this.logger.error(`Failed to send error to Rollbar: ${err.message}`, err.stack);
        } else {
          this.logger.log(`Rollbar error logged successfully - UUID: ${uuid}`);
          this.logger.debug(
            `Rollbar error details - Path: ${request.url}, Method: ${request.method}, Status: ${status}`,
          );
        }
      });
    }

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Check if response has already been sent (e.g., in streaming responses)
    if (!response.headersSent) {
      return response.status(status).json(errorResponse);
    }
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};

    const sanitized = { ...headers };
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key", "x-auth-token", "x-access-token"];

    for (const header of sensitiveHeaders) {
      if (header in sanitized) {
        sanitized[header] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  /**
   * Helper method to log info messages to Rollbar
   * Can be used for tracking important non-error events
   */
  public logToRollbar(level: "info" | "warning" | "error", message: string, data?: any) {
    this.logger.log(`Sending ${level} to Rollbar: ${message}`);

    this.rollbar[level](message, data, (err: any, uuid: string) => {
      if (err) {
        this.logger.error(`Failed to send ${level} to Rollbar: ${err.message}`);
      } else {
        this.logger.log(`Rollbar ${level} logged successfully - UUID: ${uuid}`);
      }
    });
  }
}
