export type RateLimitEndpoint = "context" | "create" | "update" | "submit";

export interface RateLimitInput {
  readonly key: string;
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(input: RateLimitInput): Promise<RateLimitDecision>;
}
