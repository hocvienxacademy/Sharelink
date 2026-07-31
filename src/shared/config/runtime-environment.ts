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

export function validateStagingDatabaseTarget(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): URL {
  const databaseUrl = parseUrl(
    required(environment, "DATABASE_URL"),
    "DATABASE_URL",
  );
  const allowedHosts = new Set(
    required(environment, "STAGING_DATABASE_ALLOWED_HOSTS")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const databaseName = decodeURIComponent(
    databaseUrl.pathname.replace(/^\/+/, ""),
  ).toLowerCase();
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error("DATABASE_URL must use PostgreSQL.");
  }
  if (
    !databaseName.includes("staging") ||
    databaseName.includes("test") ||
    databaseName.includes("prod")
  ) {
    throw new Error("DATABASE_URL must name an explicit staging database.");
  }
  if (
    !allowedHosts.has(databaseUrl.hostname.toLowerCase()) ||
    databaseUrl.hostname.toLowerCase().includes("prod") ||
    ["localhost", "127.0.0.1", "::1"].includes(
      databaseUrl.hostname.toLowerCase(),
    )
  ) {
    throw new Error("DATABASE_URL host is not in the staging allowlist.");
  }
  if (
    !["require", "verify-ca", "verify-full"].includes(
      databaseUrl.searchParams.get("sslmode") ?? "",
    )
  ) {
    throw new Error("Staging DATABASE_URL must require PostgreSQL SSL.");
  }
  return databaseUrl;
}

export function validateRuntimeEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (
    environment.APP_ENV === "build" &&
    environment.SHARE_LINK_BUILD_PHASE === "1"
  ) {
    return;
  }
  if (
    environment.APP_ENV === "test" &&
    environment.LOCAL_E2E_RUNTIME === "1" &&
    environment.DATABASE_URL?.toLowerCase().includes("test")
  ) {
    return;
  }
  if (environment.APP_ENV !== "staging" && environment.APP_ENV !== "production") {
    throw new Error("APP_ENV must explicitly identify staging or production.");
  }
  if (environment.APP_ENV === "production") {
    throw new Error(
      "Production runtime is intentionally disabled for this staging candidate.",
    );
  }

  validateStagingDatabaseTarget(environment);
  const redisUrl = parseUrl(
    required(environment, "RATE_LIMIT_REDIS_REST_URL"),
    "RATE_LIMIT_REDIS_REST_URL",
  );
  const appBaseUrl = parseUrl(required(environment, "APP_BASE_URL"), "APP_BASE_URL");
  const keySecret = required(environment, "RATE_LIMIT_KEY_SECRET");
  const redisHosts = new Set(
    required(environment, "STAGING_REDIS_ALLOWED_HOSTS")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  required(environment, "RATE_LIMIT_REDIS_REST_TOKEN");
  required(environment, "RELEASE_SHA");

  if (environment.NODE_ENV !== "production") {
    throw new Error("Staging and production require NODE_ENV=production.");
  }
  if (
    !redisHosts.has(redisUrl.hostname.toLowerCase()) ||
    redisUrl.hostname.toLowerCase().includes("prod")
  ) {
    throw new Error("Redis host is not in the staging allowlist.");
  }
  if (redisUrl.protocol !== "https:" || appBaseUrl.protocol !== "https:") {
    throw new Error("Staging service URLs must use HTTPS.");
  }
  if (
    environment.APP_ENV === "staging" &&
    !appBaseUrl.hostname.toLowerCase().includes("staging")
  ) {
    throw new Error("APP_BASE_URL must use an explicit staging hostname.");
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
