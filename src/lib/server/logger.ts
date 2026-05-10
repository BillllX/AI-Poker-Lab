type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = normalizeLevel(process.env.LOG_LEVEL) ?? "info";
const redactedKeyPattern = /token|password|secret|authorization|cookie|database_url|databaseUrl|connectionString/i;

export const logger = {
  debug: (event: string, meta: LogMeta = {}) => writeLog("debug", event, meta),
  info: (event: string, meta: LogMeta = {}) => writeLog("info", event, meta),
  warn: (event: string, meta: LogMeta = {}) => writeLog("warn", event, meta),
  error: (event: string, meta: LogMeta = {}) => writeLog("error", event, meta),
};

function writeLog(level: LogLevel, event: string, meta: LogMeta) {
  if (levelPriority[level] < levelPriority[configuredLevel]) {
    return;
  }

  const sanitizedMeta = sanitize(meta);
  const entry = {
    at: new Date().toISOString(),
    level,
    event,
    ...(isRecord(sanitizedMeta) ? sanitizedMeta : { meta: sanitizedMeta }),
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function normalizeLevel(value: unknown): LogLevel | undefined {
  return value === "debug" || value === "info" || value === "warn" || value === "error" ? value : undefined;
}

function isRecord(value: unknown): value is LogMeta {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 1_000 ? `${value.slice(0, 1_000)}...` : value;
  }

  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    return undefined;
  }

  if (depth >= 4) {
    return "[depth-limit]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  }

  const sanitized: LogMeta = {};
  for (const [key, rawValue] of Object.entries(value)) {
    sanitized[key] = redactedKeyPattern.test(key) ? "[redacted]" : sanitize(rawValue, depth + 1);
  }
  return sanitized;
}
