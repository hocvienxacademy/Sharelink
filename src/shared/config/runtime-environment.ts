const LOG_LEVELS = new Set(["error", "warn", "info"]);
const LOCAL_DEVELOPMENT_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);
const NON_DEVELOPMENT_DATABASE_MARKER =
  /(^|[_-])(test|staging|prod|production)([_-]|$)/i;
const DATABASE_TARGET_OVERRIDE_PARAMETERS = [
  "host",
  "hostaddr",
  "service",
  "dbname",
  "database",
] as const;

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

function allowlist(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
): ReadonlySet<string> {
  return new Set(
    required(environment, name)
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function containsTargetOverride(url: URL): boolean {
  return DATABASE_TARGET_OVERRIDE_PARAMETERS.some((name) =>
    url.searchParams.has(name),
  );
}

export function validateDevelopmentEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (
    environment.APP_ENV !== "development" ||
    environment.NODE_ENV !== "development"
  ) {
    throw new Error(
      "Local development requires APP_ENV=development and NODE_ENV=development.",
    );
  }

  const databaseUrl = parseUrl(
    required(environment, "DATABASE_URL"),
    "DATABASE_URL",
  );
  const databaseName = decodeURIComponent(
    databaseUrl.pathname.replace(/^\/+/, ""),
  );
  const allowedDatabaseNames = new Set(
    required(environment, "DEVELOPMENT_DATABASE_ALLOWED_NAMES")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error("Local DATABASE_URL must use PostgreSQL.");
  }
  if (!LOCAL_DEVELOPMENT_DATABASE_HOSTS.has(databaseUrl.hostname.toLowerCase())) {
    throw new Error("Local DATABASE_URL must use a loopback host.");
  }
  if (containsTargetOverride(databaseUrl)) {
    throw new Error("Local DATABASE_URL must not contain a target override.");
  }
  if (
    databaseName.length === 0 ||
    NON_DEVELOPMENT_DATABASE_MARKER.test(databaseName)
  ) {
    throw new Error("Local DATABASE_URL must name an explicit development database.");
  }
  if (!allowedDatabaseNames.has(databaseName.toLowerCase())) {
    throw new Error("Local database is not in the development database allowlist.");
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

export function validateProductionDatabaseTarget(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): URL {
  const databaseUrl = parseUrl(
    required(environment, "DATABASE_URL"),
    "DATABASE_URL",
  );
  const allowedHosts = allowlist(
    environment,
    "PRODUCTION_DATABASE_ALLOWED_HOSTS",
  );
  const allowedNames = allowlist(
    environment,
    "PRODUCTION_DATABASE_ALLOWED_NAMES",
  );
  const hostname = databaseUrl.hostname.toLowerCase();
  const databaseName = decodeURIComponent(
    databaseUrl.pathname.replace(/^\/+/, ""),
  ).toLowerCase();

  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error("Production DATABASE_URL must use PostgreSQL.");
  }
  if (
    LOCAL_DEVELOPMENT_DATABASE_HOSTS.has(hostname) ||
    !allowedHosts.has(hostname)
  ) {
    throw new Error(
      "Production database host is not in the production allowlist.",
    );
  }
  if (!databaseName || !allowedNames.has(databaseName)) {
    throw new Error(
      "Production database name is not in the production allowlist.",
    );
  }
  if (containsTargetOverride(databaseUrl)) {
    throw new Error("Production DATABASE_URL must not contain a target override.");
  }

  return databaseUrl;
}

export function validateRuntimeEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (environment.APP_ENV === "development") {
    validateDevelopmentEnvironment(environment);
    return;
  }
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
    throw new Error(
      "APP_ENV must explicitly identify development, staging, or production.",
    );
  }
  if (environment.APP_ENV === "staging") {
    validateStagingDatabaseTarget(environment);
  } else {
    validateProductionDatabaseTarget(environment);
  }
  const redisUrl = parseUrl(
    required(environment, "RATE_LIMIT_REDIS_REST_URL"),
    "RATE_LIMIT_REDIS_REST_URL",
  );
  const appBaseUrlValue =
    environment.APP_BASE_URL?.trim() || environment.RENDER_EXTERNAL_URL?.trim();
  if (!appBaseUrlValue) {
    throw new Error(
      "Missing required environment variable: APP_BASE_URL or RENDER_EXTERNAL_URL",
    );
  }
  const appBaseUrl = parseUrl(
    appBaseUrlValue,
    "APP_BASE_URL or RENDER_EXTERNAL_URL",
  );
  const keySecret = required(environment, "RATE_LIMIT_KEY_SECRET");
  const redisHosts = allowlist(
    environment,
    environment.APP_ENV === "staging"
      ? "STAGING_REDIS_ALLOWED_HOSTS"
      : "PRODUCTION_REDIS_ALLOWED_HOSTS",
  );
  required(environment, "RATE_LIMIT_REDIS_REST_TOKEN");
  if (
    !environment.RELEASE_SHA?.trim() &&
    !environment.RENDER_GIT_COMMIT?.trim()
  ) {
    throw new Error(
      "Missing required environment variable: RELEASE_SHA or RENDER_GIT_COMMIT",
    );
  }

  if (environment.NODE_ENV !== "production") {
    throw new Error("Staging and production require NODE_ENV=production.");
  }
  if (
    !redisHosts.has(redisUrl.hostname.toLowerCase()) ||
    (environment.APP_ENV === "staging" &&
      redisUrl.hostname.toLowerCase().includes("prod"))
  ) {
    throw new Error(
      environment.APP_ENV === "staging"
        ? "Redis host is not in the staging allowlist."
        : "Production Redis host is not in the production allowlist.",
    );
  }
  if (redisUrl.protocol !== "https:" || appBaseUrl.protocol !== "https:") {
    throw new Error("Deployment service URLs must use HTTPS.");
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
