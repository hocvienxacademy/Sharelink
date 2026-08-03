import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  normalizeLoginUsername,
  type AuthenticatedAdminSession,
} from "@/modules/auth";
import {
  authenticateAdmin,
  revokeAdminSession,
} from "@/composition/auth";
import { createErrorResponse } from "@/shared/http";
import { isSameOriginRequest, readJsonBody } from "@/shared/http/next";
import {
  getRateLimitGuard,
  type RateLimitGuard,
} from "@/shared/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginHandlerDependencies {
  readonly authenticate: (
    input: unknown,
    environment?: Readonly<Record<string, string | undefined>>,
  ) => Promise<AuthenticatedAdminSession>;
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly rateLimitGuard: RateLimitGuard;
  readonly revoke: (token: string | undefined) => Promise<void>;
}

export function createLoginHandler(
  overrides: Partial<LoginHandlerDependencies> = {},
) {
  const authenticate = overrides.authenticate ?? authenticateAdmin;
  const environment = overrides.environment ?? process.env;
  const rateLimitGuard = overrides.rateLimitGuard ?? getRateLimitGuard();
  const revoke = overrides.revoke ?? revokeAdminSession;

  return async function login(request: NextRequest): Promise<NextResponse> {
    try {
      if (!isSameOriginRequest(request)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "BAD_REQUEST", message: "Yêu cầu không hợp lệ." },
          },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      const payload = await readJsonBody(request, 2_048);
      const usernameInput =
        typeof payload === "object" &&
        payload !== null &&
        "username" in payload &&
        typeof payload.username === "string"
          ? payload.username
          : null;
      const normalizedUsername = normalizeLoginUsername(usernameInput);

      await rateLimitGuard.enforce({
        endpoint: "auth-login",
        request,
        token: normalizedUsername ?? "invalid-username",
      });

      const session = await authenticate(payload, environment);
      const response = NextResponse.json({
        success: true,
        data: {
          user: {
            id: session.identity.id,
            username: session.identity.username,
            role: session.identity.role,
            displayName: session.identity.fullName,
          },
        },
      });

      try {
        response.cookies.set(ADMIN_SESSION_COOKIE, session.token, {
          httpOnly: true,
          sameSite: "lax",
          secure:
            environment.APP_ENV === "staging" ||
            environment.APP_ENV === "production",
          path: "/",
          expires: session.expiresAt,
        });
      } catch (error: unknown) {
        await revoke(session.token);
        throw error;
      }

      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error: unknown) {
      const apiResponse = createErrorResponse(error);
      return NextResponse.json(apiResponse.body, {
        status: apiResponse.status,
        headers: { "Cache-Control": "no-store" },
      });
    }
  };
}

export const POST = createLoginHandler();
