const LOG_LEVELS = new Set(["error", "warn", "info"]);

function required(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseUrl(value: string, name: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

export function validateRuntimeEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (environment.APP_ENV !== "staging" && environment.APP_ENV !== "production") {
    return;
  }

  const databaseUrl = parseUrl(required(environment, "DATABASE_URL"), "DATABASE_URL");
  const redisUrl = parseUrl(
    required(environment, "RATE_LIMIT_REDIS_REST_URL"),
    "RATE_LIMIT_REDIS_REST_URL",
  );
  const appBaseUrl = parseUrl(required(environment, "APP_BASE_URL"), "APP_BASE_URL");
  const keySecret = required(environment, "RATE_LIMIT_KEY_SECRET");
  required(environment, "RATE_LIMIT_REDIS_REST_TOKEN");
  required(environment, "RELEASE_SHA");

  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error("DATABASE_URL must use PostgreSQL.");
  }
  if (
    environment.APP_ENV === "staging" &&
    !databaseUrl.pathname.toLowerCase().includes("staging")
  ) {
    throw new Error("Staging DATABASE_URL must name an explicit staging database.");
  }
  if (redisUrl.protocol !== "https:" || appBaseUrl.protocol !== "https:") {
    throw new Error("Staging service URLs must use HTTPS.");
  }
  if (keySecret.length < 32) {
    throw new Error("RATE_LIMIT_KEY_SECRET must contain at least 32 characters.");
  }
  if (
    environment.LOG_LEVEL !== undefined &&
    !LOG_LEVELS.has(environment.LOG_LEVEL)
  ) {
    throw new Error("LOG_LEVEL must be one of: error, warn, info.");
  }
  const bodyLimit = Number(environment.REQUEST_BODY_MAX_BYTES ?? 65_536);
  if (!Number.isSafeInteger(bodyLimit) || bodyLimit < 16_384 || bodyLimit > 262_144) {
    throw new Error("REQUEST_BODY_MAX_BYTES must be between 16384 and 262144.");
  }
}
