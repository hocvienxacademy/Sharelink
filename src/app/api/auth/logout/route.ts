import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, revokeAdminSession } from "@/modules/auth";
import { isSameOriginRequest } from "@/shared/http/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Yêu cầu không hợp lệ." } },
      { status: 400 },
    );
  }

  await revokeAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const response = NextResponse.json({ success: true, data: null });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.APP_ENV === "staging" ||
      process.env.APP_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
