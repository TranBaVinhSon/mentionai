import { LoggerService } from "@nestjs/common";
import * as winston from "winston";
import "winston-daily-rotate-file";

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Development format: Simple, colored console output
const devFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }), // Log stack traces
  printf(({ level, message, timestamp, stack, context }) => {
    const ctx = context ? `[${context}] ` : "";
    const stackInfo = stack ? `\n${stack}` : "";
    return `${timestamp} ${level}: ${ctx}${message}${stackInfo}`;
  }),
);

// Production format: Single-line JSON
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }), // Log stack traces
  json(), // Output as JSON
);

const isProduction = process.env.NODE_ENV === "production";

export class WinstonLogger implements LoggerService {
  private logger: winston.Logger;
  private defaultContext?: string; // Store default context

  constructor(context?: string) {
    this.defaultContext = context; // Store default context if provided
    this.logger = winston.createLogger({
      level: isProduction ? "info" : "debug", // Adjust log level based on environment
      levels: levels,
      format: isProduction ? prodFormat : devFormat,
      transports: [
        new winston.transports.Console(),
        // Optionally add file transports for production if needed
        // new winston.transports.DailyRotateFile({
        //   filename: 'logs/application-%DATE%.log',
        //   datePattern: 'YYYY-MM-DD',
        //   zippedArchive: true,
        //   maxSize: '20m',
        //   maxFiles: '14d',
        //   format: prodFormat, // Use JSON format for files too
        // }),
        // new winston.transports.DailyRotateFile({
        //   filename: 'logs/error-%DATE%.log',
        //   level: 'error',
        //   datePattern: 'YYYY-MM-DD',
        //   zippedArchive: true,
        //   maxSize: '20m',
        //   maxFiles: '14d',
        //   format: prodFormat, // Use JSON format for files too
        // }),
      ],
      defaultMeta: this.defaultContext ? { context: this.defaultContext } : undefined,
      exceptionHandlers: [
        // Handle uncaught exceptions
        new winston.transports.Console({
          format: isProduction ? prodFormat : devFormat,
        }),
        // new winston.transports.File({ filename: 'logs/exceptions.log', format: prodFormat })
      ],
      rejectionHandlers: [
        // Handle unhandled promise rejections
        new winston.transports.Console({
          format: isProduction ? prodFormat : devFormat,
        }),
        // new winston.transports.File({ filename: 'logs/rejections.log', format: prodFormat })
      ],
      exitOnError: false, // Do not exit on handled exceptions
    });
  }

  // Helper to prepare metadata, ensuring context is handled correctly
  private prepareMeta(message: any, contextOrMeta?: string | object, trace?: string): Record<string, any> {
    let meta: Record<string, any> = {};
    let contextString: string | undefined;

    if (typeof contextOrMeta === "string") {
      // Explicit context string provided
      contextString = contextOrMeta;
    } else if (typeof contextOrMeta === "object" && contextOrMeta !== null) {
      // Metadata object provided
      meta = { ...contextOrMeta };
      // If context is *also* in the meta object, use it (less common)
      if (typeof meta.context === "string") {
        contextString = meta.context;
      }
    }

    // If an explicit context wasn't provided in this call, Winston uses defaultMeta
    // So we only need to add context to meta if it was explicitly passed here.
    if (contextString) {
      meta.context = contextString;
    }

    // Handle Error object passed as message
    if (message instanceof Error) {
      meta.stack = trace || message.stack;
      // The actual message content will be message.message in the calling methods
    }
    // Handle trace if provided separately
    else if (trace) {
      meta.stack = trace;
    }

    return meta;
  }

  log(message: any, contextOrMeta?: string | object) {
    const meta = this.prepareMeta(message, contextOrMeta);
    const logMessage = message instanceof Error ? message.message : message;
    // Pass the prepared metadata object to Winston
    this.logger.info(logMessage, meta);
  }

  error(message: any, traceOrContextOrMeta?: string | object, contextOrMeta?: string | object) {
    let trace: string | undefined;
    let contextArg: string | object | undefined;

    // Disambiguate arguments for error: error(message, trace, context) vs error(message, context) vs error(message, meta) vs error(message, trace)
    if (typeof traceOrContextOrMeta === "string" && typeof contextOrMeta === "string") {
      // error(message, trace, context)
      trace = traceOrContextOrMeta;
      contextArg = contextOrMeta;
    } else if (typeof traceOrContextOrMeta === "string" && contextOrMeta === undefined) {
      // Could be error(message, trace) OR error(message, context)
      // Heuristic: if it looks like a stack trace, assume it's trace.
      if (traceOrContextOrMeta.includes("\n") && traceOrContextOrMeta.includes("at ")) {
        trace = traceOrContextOrMeta;
      } else {
        contextArg = traceOrContextOrMeta; // Assume context
      }
    } else if (typeof traceOrContextOrMeta === "object" && traceOrContextOrMeta !== null) {
      // error(message, metadata)
      contextArg = traceOrContextOrMeta;
      // trace might be inside the metadata if it's an error object
      if (message instanceof Error) {
        trace = trace || message.stack;
      }
    } else {
      // error(message) - no trace/context/meta
      if (message instanceof Error) {
        trace = message.stack;
      }
    }

    const meta = this.prepareMeta(message, contextArg, trace);
    const logMessage = message instanceof Error ? message.message : message;
    this.logger.error(logMessage, meta);
  }

  warn(message: any, contextOrMeta?: string | object) {
    const meta = this.prepareMeta(message, contextOrMeta);
    const logMessage = message instanceof Error ? message.message : message;
    this.logger.warn(logMessage, meta);
  }

  debug?(message: any, contextOrMeta?: string | object) {
    // Check level before preparing/logging for performance
    if (this.logger.isLevelEnabled("debug")) {
      const meta = this.prepareMeta(message, contextOrMeta);
      const logMessage = message instanceof Error ? message.message : message;
      this.logger.debug(logMessage, meta);
    }
  }

  verbose?(message: any, contextOrMeta?: string | object) {
    // Check level before preparing/logging for performance
    if (this.logger.isLevelEnabled("verbose")) {
      const meta = this.prepareMeta(message, contextOrMeta);
      const logMessage = message instanceof Error ? message.message : message;
      this.logger.verbose(logMessage, meta);
    }
  }

  // Add http level if needed for HTTP request logging
  http?(message: any, contextOrMeta?: string | object) {
    // Check level before preparing/logging for performance
    if (this.logger.isLevelEnabled("http")) {
      const meta = this.prepareMeta(message, contextOrMeta);
      const logMessage = message instanceof Error ? message.message : message;
      this.logger.http(logMessage, meta);
    }
  }
}
