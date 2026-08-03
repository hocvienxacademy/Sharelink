import { NextResponse, type NextRequest } from "next/server";

export function buildContentSecurityPolicy(
  nonce: string,
  nodeEnvironment = process.env.NODE_ENV,
): string {
  const developmentScriptDirective =
    nodeEnvironment === "development" ? " 'unsafe-eval'" : "";
  const styleDirective = nodeEnvironment === "development"
    ? "style-src 'self' 'unsafe-inline'"
    : `style-src 'self' 'nonce-${nonce}'`;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' blob: data:",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScriptDirective}`,
    styleDirective,
    "form-action 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
