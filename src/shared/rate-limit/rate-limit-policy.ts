import type { RateLimitEndpoint } from "./rate-limiter";

export interface RateLimitPolicy {
  readonly limit: number;
  readonly windowMs: number;
  readonly failOpen: boolean;
}

const DEFAULT_POLICIES: Readonly<Record<RateLimitEndpoint, RateLimitPolicy>> = {
  "auth-login": { limit: 5, windowMs: 600_000, failOpen: false },
  context: { limit: 60, windowMs: 60_000, failOpen: true },
  create: { limit: 5, windowMs: 600_000, failOpen: false },
  update: { limit: 30, windowMs: 600_000, failOpen: false },
  submit: { limit: 5, windowMs: 600_000, failOpen: false },
  "word-export": { limit: 10, windowMs: 600_000, failOpen: false },
};

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRateLimitPolicy(
  endpoint: RateLimitEndpoint,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RateLimitPolicy {
  const fallback = DEFAULT_POLICIES[endpoint];
  const prefix = `RATE_LIMIT_${endpoint.toUpperCase()}`;
  return {
    ...fallback,
    limit: positiveInteger(environment[`${prefix}_LIMIT`], fallback.limit),
    windowMs: positiveInteger(
      environment[`${prefix}_WINDOW_SECONDS`],
      fallback.windowMs / 1000,
    ) * 1000,
  };
}
