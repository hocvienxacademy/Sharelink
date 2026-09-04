export type RateLimitEndpoint =
  | "auth-login"
  | "account-password"
  | "context"
  | "create"
  | "update"
  | "submit"
  | "word-export";

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
