import { NextResponse, type NextRequest } from "next/server";
import { revokeAdminSession } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE } from "@/modules/auth";
import { createErrorResponse } from "@/shared/http";
import { isSameOriginRequest } from "@/shared/http/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LogoutHandlerDependencies {
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly revoke: (token: string | undefined) => Promise<void>;
}

function clearSessionCookie(
  response: NextResponse,
  environment: Readonly<Record<string, string | undefined>>,
): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure:
      environment.APP_ENV === "staging" ||
      environment.APP_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
}

export function createLogoutHandler(
  overrides: Partial<LogoutHandlerDependencies> = {},
) {
  const environment = overrides.environment ?? process.env;
  const revoke = overrides.revoke ?? revokeAdminSession;

  return async function logout(request: NextRequest): Promise<NextResponse> {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Yêu cầu không hợp lệ." },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    try {
      await revoke(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
      const response = NextResponse.json({ success: true, data: null });
      clearSessionCookie(response, environment);
      return response;
    } catch (error: unknown) {
      const apiResponse = createErrorResponse(error);
      const response = NextResponse.json(apiResponse.body, {
        status: apiResponse.status,
      });
      clearSessionCookie(response, environment);
      return response;
    }
  };
}

export const POST = createLogoutHandler();
