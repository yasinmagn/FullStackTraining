/**
 * Configuration, loaded once and validated at startup.
 *
 * The rule this module exists to enforce:
 *
 *   FAIL FAST, AT BOOT, WITH A MESSAGE THAT NAMES THE MISSING VARIABLE.
 *
 * The alternative - reading `process.env.WHATEVER` wherever you happen to need
 * it - fails at 3am, inside a request, as `undefined` propagating into a
 * connection string. A container that refuses to start is a page you can act
 * on; a container that starts and then quietly 500s is not.
 */

/**
 * Read a required variable, or throw.
 *
 * @param {string} name
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function requireEnv(name, env = process.env) {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill it in (see docs/00-setup.md).`,
    );
  }
  return value;
}

/**
 * Read an optional variable with a default.
 *
 * Note `??` rather than `||`: with `||`, setting LOG_LEVEL to an empty string
 * would silently fall back, and a numeric variable set to `0` would become the
 * default. This bites people constantly.
 *
 * @template T
 * @param {string} name
 * @param {T} fallback
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | T}
 */
export function optionalEnv(name, fallback, env = process.env) {
  return env[name] ?? fallback;
}

/**
 * Parse an integer variable, rejecting garbage rather than yielding NaN.
 *
 * @param {string} name
 * @param {number} fallback
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number}
 */
export function intEnv(name, fallback, env = process.env) {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const parsed = Number(raw);
  // `Number.isInteger` also rejects NaN and Infinity, unlike `parseInt`, which
  // happily turns "3 bananas" into 3 and "banana" into NaN.
  if (!Number.isInteger(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got: ${raw}`);
  }
  return parsed;
}

/**
 * Parse a boolean. Environment variables are ALWAYS strings - `Boolean('false')`
 * is `true`, which is a bug people ship repeatedly.
 *
 * @param {string} name
 * @param {boolean} fallback
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function boolEnv(name, fallback, env = process.env) {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const normalised = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalised)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalised)) return false;

  throw new Error(`Environment variable ${name} must be a boolean, got: ${raw}`);
}

/**
 * Build the whole config in one place, so a missing variable is one error at
 * boot rather than a surprise on some rarely-hit code path.
 *
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadConfig(env = process.env) {
  const nodeEnv = optionalEnv('NODE_ENV', 'development', env);

  return Object.freeze({
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: intEnv('PORT', 3000, env),
    logLevel: optionalEnv('LOG_LEVEL', 'info', env),
    // Note the shape: a config object, not scattered process.env reads. Every
    // consumer takes this object, which also makes it trivial to fake in tests.
    features: Object.freeze({
      verboseErrors: boolEnv('VERBOSE_ERRORS', nodeEnv !== 'production', env),
    }),
  });
}
