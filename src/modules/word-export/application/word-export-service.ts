import type { AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError } from "@/shared/errors";
import { parseRegistrationToken } from "@/modules/registration-links";
import { parseApplicationIdentifier } from "@/modules/applications";
import { StaffApplicationAuthorizationPolicy } from "@/modules/applications/application/authorization/staff-application-authorization";
import {
  digestExportCode,
  parseExportCode,
} from "./export-credential";
import type {
  ApplicationWordExportRecord,
  WordExportRepository,
} from "./word-export-repository";

const DOWNLOADABLE_STATUSES = new Set([
  "SUBMITTED",
  "WAITING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "NEEDS_REVISION",
  "VALID",
  "PRINTED",
  "COMPLETED",
]);

export interface WordDocumentGenerator {
  generate(record: ApplicationWordExportRecord): Uint8Array;
}

export interface WordDownload {
  readonly bytes: Uint8Array;
  readonly fileName: string;
}

interface DownloadServiceOptions {
  readonly maximumAttempts?: number;
  readonly lockDurationMs?: number;
  readonly now?: () => Date;
}

function safeFileSegment(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, 80) || "ho-so";
}

function toDownload(
  record: ApplicationWordExportRecord,
  generator: WordDocumentGenerator,
): WordDownload {
  const reference = record.applicationCode ?? record.id.slice(0, 8);
  return {
    bytes: generator.generate(record),
    fileName: `phieu-du-tuyen-${safeFileSegment(reference)}.docx`,
  };
}

function isDownloadable(record: { readonly status: string; readonly submittedAt?: Date | null }): boolean {
  return DOWNLOADABLE_STATUSES.has(record.status) && record.submittedAt !== null;
}

export class DownloadApplicationWord {
  private readonly maximumAttempts: number;
  private readonly lockDurationMs: number;
  private readonly now: () => Date;

  constructor(
    private readonly repository: WordExportRepository,
    private readonly generator: WordDocumentGenerator,
    options: DownloadServiceOptions = {},
    private readonly staffPolicy = new StaffApplicationAuthorizationPolicy(),
  ) {
    this.maximumAttempts = options.maximumAttempts ?? 5;
    this.lockDurationMs = options.lockDurationMs ?? 15 * 60 * 1000;
    this.now = options.now ?? (() => new Date());
  }

  async forStudent(
    tokenInput: unknown,
    codeInput: unknown,
    requestId: string,
  ): Promise<WordDownload> {
    const token = parseRegistrationToken(tokenInput);
    const code = parseExportCode(codeInput);
    const attemptedAt = this.now();
    const record = await this.repository.authorizeStudentDownload({
      token,
      codeDigest: digestExportCode(code),
      attemptedAt,
      maximumAttempts: this.maximumAttempts,
      lockedUntil: new Date(attemptedAt.getTime() + this.lockDurationMs),
      requestId,
    });

    if (record === null || !isDownloadable(record)) {
      throw new NotFoundError("Application export");
    }
    return toDownload(record, this.generator);
  }

  async forStaff(
    actor: AuthenticatedActor,
    applicationIdInput: unknown,
    requestId: string,
  ): Promise<WordDownload> {
    const applicationId = parseApplicationIdentifier(applicationIdInput);
    const resource = await this.repository.findStaffAuthorizationResource(applicationId);
    if (
      resource === null ||
      !DOWNLOADABLE_STATUSES.has(resource.status) ||
      !this.staffPolicy.authorize("application.exportWord", actor, resource).allowed
    ) {
      throw new NotFoundError("Application export");
    }
    const record = await this.repository.loadForStaffDownload({
      actor,
      applicationId,
      requestId,
    });
    if (record === null || !isDownloadable(record)) {
      throw new NotFoundError("Application export");
    }
    return toDownload(record, this.generator);
  }
}
