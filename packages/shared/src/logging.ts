export type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type LoggerLike = {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): LoggerLike;
};

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  info: 20,
  warn: 30,
  error: 40,
};

function normalizeLogLevel(rawLevel: string | undefined): LogLevel {
  switch ((rawLevel ?? "").toLowerCase()) {
    case "error":
      return "error";
    case "warn":
      return "warn";
    case "info":
    default:
      return "info";
  }
}

function shouldWrite(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}

function mergeContext(baseContext: LogContext | undefined, nextContext: LogContext | undefined): LogContext | undefined {
  if (!baseContext && !nextContext) {
    return undefined;
  }

  return {
    ...(baseContext ?? {}),
    ...(nextContext ?? {}),
  };
}

function write(
  level: LogLevel,
  service: string,
  message: string,
  context: LogContext | undefined,
  minLevel: LogLevel,
) {
  if (!shouldWrite(level, minLevel)) {
    return;
  }

  const entry = {
    level,
    service,
    message,
    context,
    ts: new Date().toISOString(),
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}

export function createLogger(
  service: string,
  options?: {
    context?: LogContext;
    minLevel?: LogLevel;
  },
): LoggerLike {
  const minLevel = options?.minLevel ?? normalizeLogLevel(process.env.LOG_LEVEL);
  const baseContext = options?.context;

  return {
    info(message: string, context?: LogContext) {
      write("info", service, message, mergeContext(baseContext, context), minLevel);
    },
    warn(message: string, context?: LogContext) {
      write("warn", service, message, mergeContext(baseContext, context), minLevel);
    },
    error(message: string, context?: LogContext) {
      write("error", service, message, mergeContext(baseContext, context), minLevel);
    },
    child(context: LogContext): LoggerLike {
      return createLogger(service, {
        context: mergeContext(baseContext, context),
        minLevel,
      });
    },
  };
}
