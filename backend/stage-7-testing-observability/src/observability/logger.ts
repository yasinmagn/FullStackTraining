/**
 * STRUCTURED LOGGING, with no dependency.
 *
 * The one rule: log JSON, not prose.
 *
 *   console.log(`User ${id} updated task ${taskId} in ${ms}ms`);   // ✗
 *   logger.info('task.updated', { userId, taskId, durationMs });   // ✓
 *
 * A log aggregator (Datadog, CloudWatch, Loki, Elastic) can filter, group and
 * alert on structured fields. It can do almost nothing with a sentence. The
 * moment you want "p95 duration of task.updated, by user" the prose version
 * requires a regex, and the regex breaks the next time someone edits the
 * message.
 *
 * In production use `pino` - it is faster and handles serialisation edge cases.
 * This is the same shape in 90 lines so nothing is hidden.
 */

export const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
export type LogLevel = keyof typeof LOG_LEVELS;

export interface LogRecord {
  level: LogLevel;
  time: string;
  msg: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  /** A logger that carries fixed fields - e.g. a requestId - on every line. */
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Keys whose values are redacted.
 *
 * Sooner or later someone logs an entire request body, and that body contains a
 * password or a token. Redacting centrally means it fails safe: the person
 * adding the log line does not have to remember.
 */
const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'databaseurl',
  'connectionstring',
]);

const REDACTED = '[redacted]';

export function redact(value: unknown, depth = 0): unknown {
  // Bound the depth: a cyclic or deeply nested object would otherwise recurse
  // forever inside your logger, which is a spectacular way to take down a
  // service.
  if (depth > 6) return '[too deep]';

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = REDACTED_KEYS.has(key.toLowerCase().replace(/[_-]/g, ''))
        ? REDACTED
        : redact(item, depth + 1);
    }
    return output;
  }

  return value;
}

export interface LoggerOptions {
  level?: LogLevel;
  /** Where a line goes. Injected so tests can capture instead of printing. */
  write?: (record: LogRecord) => void;
  bindings?: Record<string, unknown>;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const {
    level = (process.env.LOG_LEVEL as LogLevel) ?? 'info',
    // stdout, always. A container platform collects stdout; writing to a file
    // inside a container means the logs vanish with the container.
    write = (record: LogRecord) => process.stdout.write(`${JSON.stringify(record)}\n`),
    bindings = {},
  } = options;

  const threshold = LOG_LEVELS[level] ?? LOG_LEVELS.info;

  const log = (recordLevel: LogLevel, msg: string, fields: Record<string, unknown> = {}) => {
    if (LOG_LEVELS[recordLevel] < threshold) return;

    write({
      level: recordLevel,
      time: new Date().toISOString(),
      msg,
      ...bindings,
      ...(redact(fields) as Record<string, unknown>),
    });
  };

  return {
    debug: (msg, fields) => log('debug', msg, fields),
    info: (msg, fields) => log('info', msg, fields),
    warn: (msg, fields) => log('warn', msg, fields),
    error: (msg, fields) => log('error', msg, fields),
    // A child logger stamps every line with the same context - the single most
    // useful logging feature there is, because it turns "find all lines for
    // this request" into a field filter instead of a search.
    child: (extra) => createLogger({ level, write, bindings: { ...bindings, ...extra } }),
  };
}
