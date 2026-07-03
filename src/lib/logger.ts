/**
 * Structured JSON Logger for Digital Pandharpur
 *
 * Replaces console.log/console.error with structured, queryable log output.
 * Each log entry includes: timestamp, level, message, requestId, context, and error details.
 *
 * Usage:
 *   import { logger } from '@/src/lib/logger';
 *   logger.info('Composition indexed', { compositionId: 'abc', index: 42 });
 *   logger.error('Database query failed', { query: 'findUnique', error });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  service: string;
  version: string;
}

// Request-scoped context (set via AsyncLocalStorage or header)
let currentRequestId: string | undefined;

/**
 * Set the current request ID for all subsequent log calls in this context.
 */
export function setRequestId(id: string | undefined): void {
  currentRequestId = id;
}

/**
 * Get the current request ID.
 */
export function getRequestId(): string | undefined {
  return currentRequestId;
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: unknown): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'digital-pandharpur',
    version: process.env.npm_package_version || '0.1.0',
  };

  if (currentRequestId) {
    entry.requestId = currentRequestId;
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error !== undefined) {
    entry.error = {
      name: 'Unknown',
      message: String(error),
    };
  }

  return entry;
}

function output(entry: LogEntry): void {
  // In production, output JSON for log aggregation tools
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(entry));
  } else {
    // In development, use readable format
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const reqId = entry.requestId ? ` [${entry.requestId}]` : '';
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const err = entry.error ? `\n  Error: ${entry.error.message}\n  ${entry.error.stack || ''}` : '';

    if (entry.level === 'error') {
      console.error(`${prefix}${reqId} ${entry.message}${ctx}${err}`);
    } else if (entry.level === 'warn') {
      console.warn(`${prefix}${reqId} ${entry.message}${ctx}`);
    } else {
      console.log(`${prefix}${reqId} ${entry.message}${ctx}`);
    }
  }
}

/**
 * Structured logger with request context.
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    output(formatLog('debug', message, context));
  },

  info(message: string, context?: LogContext): void {
    output(formatLog('info', message, context));
  },

  warn(message: string, context?: LogContext): void {
    output(formatLog('warn', message, context));
  },

  error(message: string, context?: LogContext, error?: unknown): void {
    output(formatLog('error', message, context, error));
  },
};

/**
 * Create a child logger with a fixed prefix context.
 */
export function createLogger(prefix: string, baseContext?: LogContext) {
  return {
    debug(message: string, context?: LogContext) {
      logger.debug(message, { ...baseContext, ...context, module: prefix });
    },
    info(message: string, context?: LogContext) {
      logger.info(message, { ...baseContext, ...context, module: prefix });
    },
    warn(message: string, context?: LogContext) {
      logger.warn(message, { ...baseContext, ...context, module: prefix });
    },
    error(message: string, context?: LogContext, error?: unknown) {
      logger.error(message, { ...baseContext, ...context, module: prefix }, error);
    },
  };
}
