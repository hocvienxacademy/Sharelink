import type { AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError } from "@/shared/errors";
import { parseApplicationIdentifier } from "@/modules/applications";
import { StaffApplicationAuthorizationPolicy } from "@/modules/applications/application/authorization/staff-application-authorization";
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

export interface SubmissionEmailWord {
  readonly download: WordDownload;
  readonly recipientEmail: string;
  readonly templateData: {
    readonly applicationCode: string;
    readonly entryQualification: ApplicationWordExportRecord["entryQualification"];
    readonly fullName: string;
    readonly majorName: string;
    readonly submittedAt: Date;
  };
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
  const reference = applicationReference(record);
  return {
    bytes: generator.generate(record),
    fileName: `phieu-du-tuyen-${safeFileSegment(reference)}.docx`,
  };
}

function isDownloadable<T extends { readonly status: string; readonly submittedAt?: Date | null }>(
  record: T,
): record is T & { readonly submittedAt: Date } {
  return DOWNLOADABLE_STATUSES.has(record.status) && record.submittedAt instanceof Date;
}

export class DownloadApplicationWord {
  constructor(
    private readonly repository: WordExportRepository,
    private readonly generator: WordDocumentGenerator,
    private readonly staffPolicy = new StaffApplicationAuthorizationPolicy(),
  ) {}

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

  async forSubmissionEmail(
    applicationIdInput: unknown,
  ): Promise<SubmissionEmailWord> {
    const applicationId = parseApplicationIdentifier(applicationIdInput);
    const record = await this.repository.loadForSubmissionEmail(applicationId);
    if (
      record === null ||
      !isDownloadable(record) ||
      record.email === null ||
      record.email.trim().length === 0
    ) {
      throw new NotFoundError("Application export");
    }

    return {
      download: toDownload(record, this.generator),
      recipientEmail: record.email,
      templateData: {
        applicationCode: applicationReference(record),
        entryQualification: record.entryQualification,
        fullName: record.fullName ?? "Anh/Chị",
        majorName: record.majorName ?? "Chưa cập nhật",
        submittedAt: record.submittedAt,
      },
    };
  }
}

function applicationReference(record: ApplicationWordExportRecord): string {
  return record.applicationCode ?? record.id.slice(0, 8);
}
