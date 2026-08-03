import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, authenticateAdmin } from "@/modules/auth";
import { createErrorResponse } from "@/shared/http";
import { isSameOriginRequest, readJsonBody } from "@/shared/http/next";
import { getRateLimitGuard } from "@/shared/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Yêu cầu không hợp lệ." },
        },
        { status: 400 },
      );
    }

    const payload = await readJsonBody(request, 2_048);
    const identifier =
      typeof payload === "object" &&
      payload !== null &&
      "identifier" in payload &&
      typeof payload.identifier === "string"
        ? payload.identifier
        : "unknown";

    await getRateLimitGuard().enforce({
      endpoint: "auth-login",
      request,
      token: identifier,
    });

    const session = await authenticateAdmin(payload);
    const response = NextResponse.json({
      success: true,
      data: {
        fullName: session.identity.fullName,
        role: session.identity.role,
      },
    });

    response.cookies.set(ADMIN_SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.APP_ENV === "staging" ||
        process.env.APP_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error: unknown) {
    const apiResponse = createErrorResponse(error);
    return NextResponse.json(apiResponse.body, {
      status: apiResponse.status,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
