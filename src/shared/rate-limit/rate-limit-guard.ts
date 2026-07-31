import {
  RateLimitUnavailableError,
  TooManyRequestsError,
} from "../errors/index";
import { UpstashRestRateLimiter } from "../infrastructure/rate-limit/upstash-rest-rate-limiter";
import {
  getOperationalTelemetry,
  type OperationalTelemetry,
} from "../observability/index";
import { createRateLimitKey, trustedClientIdentity } from "./rate-limit-key";
import { getRateLimitPolicy } from "./rate-limit-policy";
import type { RateLimiter, RateLimitEndpoint } from "./rate-limiter";

export interface RateLimitGuard {
  enforce(input: {
    readonly endpoint: RateLimitEndpoint;
    readonly request: Request;
    readonly token: string;
  }): Promise<void>;
}

export class DefaultRateLimitGuard implements RateLimitGuard {
  constructor(
    private readonly limiter: RateLimiter,
    private readonly secret: string,
    private readonly environment: Readonly<Record<string, string | undefined>> = process.env,
    private readonly telemetry: OperationalTelemetry = getOperationalTelemetry(
      environment,
    ),
  ) {}

  async enforce(input: {
    readonly endpoint: RateLimitEndpoint;
    readonly request: Request;
    readonly token: string;
  }): Promise<void> {
    const policy = getRateLimitPolicy(input.endpoint, this.environment);
    const key = createRateLimitKey({
      endpoint: input.endpoint,
      token: input.token,
      clientIdentity: trustedClientIdentity(input.request, this.environment),
      secret: this.secret,
    });

    try {
      const decision = await this.limiter.consume({
        key,
        limit: policy.limit,
        windowMs: policy.windowMs,
      });
      if (!decision.allowed) {
        this.telemetry.record("rate_limit_block");
        throw new TooManyRequestsError(decision.retryAfterSeconds);
      }
    } catch (error: unknown) {
      if (error instanceof TooManyRequestsError) throw error;
      this.telemetry.record("redis_failure");
      if (!policy.failOpen) {
        throw new RateLimitUnavailableError({ cause: error });
      }
    }
  }
}

class NoopRateLimitGuard implements RateLimitGuard {
  async enforce(): Promise<void> {}
}

let configuredGuard: RateLimitGuard | undefined;

export function getRateLimitGuard(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RateLimitGuard {
  if (configuredGuard !== undefined) return configuredGuard;
  if (
    environment.NODE_ENV === "test" ||
    (environment.APP_ENV === "build" &&
      environment.SHARE_LINK_BUILD_PHASE === "1") ||
    (environment.APP_ENV === "test" &&
      environment.LOCAL_E2E_RUNTIME === "1" &&
      environment.DATABASE_URL?.toLowerCase().includes("test"))
  ) {
    configuredGuard = new NoopRateLimitGuard();
    return configuredGuard;
  }
  if (environment.APP_ENV !== "staging" && environment.APP_ENV !== "production") {
    throw new Error("Rate limiting requires an explicit deployment environment.");
  }

  const url = environment.RATE_LIMIT_REDIS_REST_URL;
  const token = environment.RATE_LIMIT_REDIS_REST_TOKEN;
  const secret = environment.RATE_LIMIT_KEY_SECRET;
  if (
    !url ||
    new URL(url).protocol !== "https:" ||
    !token ||
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "Rate limiting is not configured for this deployment environment.",
    );
  }

  configuredGuard = new DefaultRateLimitGuard(
    new UpstashRestRateLimiter({
      url,
      token,
      timeoutMs: 750,
    }),
    secret,
    environment,
  );
  return configuredGuard;
}

export function resetRateLimitGuardForTests(): void {
  configuredGuard = undefined;
}
