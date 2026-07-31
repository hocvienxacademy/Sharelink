import type {
  RateLimitDecision,
  RateLimiter,
  RateLimitInput,
} from "../../rate-limit/rate-limiter";

const SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("PTTL", KEYS[1])
return {count, ttl}
`.trim();

export class UpstashRestRateLimiter implements RateLimiter {
  constructor(
    private readonly options: {
      readonly url: string;
      readonly token: string;
      readonly timeoutMs: number;
      readonly fetchImplementation?: typeof fetch;
    },
  ) {}

  async consume(input: RateLimitInput): Promise<RateLimitDecision> {
    const response = await (this.options.fetchImplementation ?? fetch)(
      this.options.url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "EVAL",
          SCRIPT,
          "1",
          input.key,
          String(input.windowMs),
        ]),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      },
    );

    if (!response.ok) {
      throw new Error(`Rate-limit service returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as {
      readonly error?: unknown;
      readonly result?: unknown;
    };
    if (
      payload.error !== undefined ||
      !Array.isArray(payload.result) ||
      typeof payload.result[0] !== "number" ||
      typeof payload.result[1] !== "number"
    ) {
      throw new Error("Rate-limit service returned an invalid response.");
    }

    return {
      allowed: payload.result[0] <= input.limit,
      retryAfterSeconds: Math.max(1, Math.ceil(payload.result[1] / 1000)),
    };
  }
}
