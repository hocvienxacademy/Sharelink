import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import {
  resolveStaffActor,
  type StaffIdentityResolver,
} from "@/modules/auth/presentation/http/staff-request-guard";
import type { AuthenticatedActor } from "@/shared/authorization";
import {
  handleNextBinaryRequest,
  PRIVATE_RESPONSE_HEADERS,
} from "@/shared/http/next";
import type { WordDownload } from "../../application/word-export-service";

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface StaffWordExportService {
  forStaff(
    actor: AuthenticatedActor,
    applicationId: unknown,
    requestId: string,
  ): Promise<WordDownload>;
}

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
  resolveIdentity: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextBinaryRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolveIdentity);
        const { id } = await context.params;
        return attachment(await service.forStaff(actor, id, requestId));
      },
      PRIVATE_RESPONSE_HEADERS,
      "staff-word-export",
      requestId,
    );
  };
}
