import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { RateLimitEndpoint } from "./rate-limiter";

function firstForwardedAddress(value: string): string | null {
  const candidate = value.split(",", 1)[0]?.trim();
  return candidate !== undefined && isIP(candidate) !== 0 ? candidate : null;
}

export function trustedClientIdentity(
  request: Request,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const trustedHeader = environment.TRUSTED_PROXY_IP_HEADER?.toLowerCase();
  if (!trustedHeader) return "unknown";
  const value = request.headers.get(trustedHeader);
  return value === null ? "unknown" : (firstForwardedAddress(value) ?? "unknown");
}

export function createRateLimitKey(input: {
  readonly endpoint: RateLimitEndpoint;
  readonly token: string;
  readonly clientIdentity: string;
  readonly secret: string;
}): string {
  const digest = createHmac("sha256", input.secret)
    .update(`${input.token}\0${input.clientIdentity}`)
    .digest("hex");
  return `registration:${input.endpoint}:${digest}`;
}
