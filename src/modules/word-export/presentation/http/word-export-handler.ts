import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import { toAuthenticatedActor, type AuthenticatedActor } from "@/shared/authorization";
import { UnauthorizedError } from "@/shared/errors";
import {
  handleNextBinaryRequest,
  PRIVATE_RESPONSE_HEADERS,
} from "@/shared/http/next";
import type { WordDownload } from "../../application/word-export-service";

const DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface StaffWordExportService {
  forStaff(actor: AuthenticatedActor, applicationId: unknown, requestId: string): Promise<WordDownload>;
}

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;

function attachment(download: WordDownload): Response {
  const encodedFileName = encodeURIComponent(download.fileName);
  return new Response(Uint8Array.from(download.bytes).buffer, {
    status: 200,
    headers: {
      "Content-Type": DOCX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${download.fileName}"; filename*=UTF-8''${encodedFileName}`,
    },
  });
}

export function createStaffWordExportHandler(
  service: StaffWordExportService,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextBinaryRequest(async () => {
      const identity = await resolveIdentity(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
      if (identity === null) throw new UnauthorizedError();
      const { id } = await context.params;
      return attachment(await service.forStaff(toAuthenticatedActor(identity), id, requestId));
    }, PRIVATE_RESPONSE_HEADERS, "staff-word-export", requestId);
  };
}
