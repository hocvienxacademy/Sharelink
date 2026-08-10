import { timingSafeEqual } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { executePrismaOperation } from "@/shared/infrastructure/database/prisma";
import { toDatabaseDateOnly } from "@/shared/time";
import type { StaffApplicationAuthorizationResource } from "@/modules/applications/application/authorization/staff-application-authorization";
import type {
  ApplicationWordExportRecord,
  StaffWordDownloadInput,
  StudentWordDownloadInput,
  WordExportRepository,
} from "../application/word-export-repository";

const wordExportSelect = {
  id: true,
  application_code: true,
  status: true,
  submitted_at: true,
  entry_qualification: true,
  full_name: true,
  gender: true,
  date_of_birth: true,
  place_of_birth: true,
  ethnicity: true,
  religion: true,
  nationality: true,
  citizen_id: true,
  citizen_id_issued_date: true,
  citizen_id_issued_place: true,
  permanent_address: true,
  workplace: true,
  phone: true,
  email: true,
  contact_address: true,
  admission_diploma: true,
  graduate_major: true,
  graduation_year: true,
  high_school_name: true,
  high_school_ward: true,
  high_school_province: true,
  declaration_place: true,
  declaration_date: true,
  majors: { select: { name: true } },
  application_relatives: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      full_name: true,
      relationship: true,
      occupation: true,
      phone: true,
      address: true,
    },
  },
} as const satisfies Prisma.applicationsSelect;

type WordExportRow = Prisma.applicationsGetPayload<{
  select: typeof wordExportSelect;
}>;

interface CredentialLockRow {
  readonly application_id: string;
  readonly failed_attempts: number;
  readonly id: string;
  readonly locked_until: Date | null;
  readonly revoked_at: Date | null;
  readonly secret_hash: string;
}

function mapRecord(row: WordExportRow): ApplicationWordExportRecord {
  return {
    id: row.id,
    applicationCode: row.application_code,
    status: row.status,
    submittedAt: row.submitted_at,
    majorName: row.majors?.name ?? null,
    entryQualification: row.entry_qualification,
    fullName: row.full_name,
    gender: row.gender,
    dateOfBirth: row.date_of_birth === null ? null : toDatabaseDateOnly(row.date_of_birth),
    placeOfBirth: row.place_of_birth,
    ethnicity: row.ethnicity,
    religion: row.religion,
    nationality: row.nationality,
    citizenId: row.citizen_id,
    citizenIdIssuedDate: row.citizen_id_issued_date === null ? null : toDatabaseDateOnly(row.citizen_id_issued_date),
    citizenIdIssuedPlace: row.citizen_id_issued_place,
    permanentAddress: row.permanent_address,
    workplace: row.workplace,
    phone: row.phone,
    email: row.email,
    contactAddress: row.contact_address,
    admissionDiploma: row.admission_diploma,
    graduateMajor: row.graduate_major,
    graduationYear: row.graduation_year,
    highSchoolName: row.high_school_name,
    highSchoolWard: row.high_school_ward,
    highSchoolProvince: row.high_school_province,
    declarationPlace: row.declaration_place,
    declarationDate: row.declaration_date === null ? null : toDatabaseDateOnly(row.declaration_date),
    relatives: row.application_relatives.map((relative) => ({
      position: relative.position,
      fullName: relative.full_name,
      relationship: relative.relationship,
      occupation: relative.occupation,
      phone: relative.phone,
      address: relative.address,
    })),
  };
}

function digestMatches(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, "ascii");
  const actualBuffer = Buffer.from(actual, "ascii");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function staffScope(actor: StaffWordDownloadInput["actor"]): Prisma.applicationsWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "SALE") return { sale_id: actor.userId };
  return { users_applications_sale_idTousers: { manager_id: actor.userId } };
}

export class PrismaWordExportRepository implements WordExportRepository {
  async findStaffAuthorizationResource(
    applicationId: string,
  ): Promise<StaffApplicationAuthorizationResource | null> {
    const row = await executePrismaOperation(() =>
      prisma.applications.findUnique({
        where: { id: applicationId },
        select: {
          sale_id: true,
          status: true,
          users_applications_sale_idTousers: { select: { manager_id: true } },
        },
      }),
    );
    return row === null
      ? null
      : {
          ownerId: row.sale_id,
          ownerManagerId: row.users_applications_sale_idTousers.manager_id,
          status: row.status,
        };
  }

  async loadForStaffDownload(
    input: StaffWordDownloadInput,
  ): Promise<ApplicationWordExportRecord | null> {
    return executePrismaOperation(() =>
      prisma.$transaction(async (transaction) => {
        const row = await transaction.applications.findFirst({
          where: {
            id: input.applicationId,
            submitted_at: { not: null },
            status: { notIn: ["DRAFT", "CANCELLED"] },
            ...staffScope(input.actor),
          },
          select: wordExportSelect,
        });
        if (row === null) return null;
        await transaction.audit_logs.create({
          data: {
            actor_id: input.actor.userId,
            action: "APPLICATION_WORD_EXPORT_REQUESTED",
            entity_type: "application",
            entity_id: input.applicationId,
            metadata: {
              actorRole: input.actor.role,
              channel: "staff",
              requestId: input.requestId,
            },
          },
        });
        return mapRecord(row);
      }),
    );
  }

  async authorizeStudentDownload(
    input: StudentWordDownloadInput,
  ): Promise<ApplicationWordExportRecord | null> {
    return executePrismaOperation(() =>
      prisma.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<CredentialLockRow[]>`
          SELECT credential.id,
                 credential.application_id,
                 credential.secret_hash,
                 credential.failed_attempts,
                 credential.locked_until,
                 credential.revoked_at
          FROM application_export_credentials AS credential
          JOIN applications AS application
            ON application.id = credential.application_id
          JOIN registration_links AS registration_link
            ON registration_link.id = application.registration_link_id
          WHERE registration_link.public_token = ${input.token}::uuid
            AND application.submitted_at IS NOT NULL
            AND application.status NOT IN ('DRAFT', 'CANCELLED')
            AND registration_link.status NOT IN ('CANCELLED', 'ARCHIVED')
          FOR UPDATE OF credential
        `;
        const credential = rows[0];
        if (
          credential === undefined ||
          credential.revoked_at !== null ||
          (credential.locked_until !== null && credential.locked_until > input.attemptedAt)
        ) {
          return null;
        }

        if (!digestMatches(credential.secret_hash, input.codeDigest)) {
          const nextAttempts =
            (credential.locked_until === null ? credential.failed_attempts : 0) + 1;
          await transaction.application_export_credentials.update({
            where: { id: credential.id },
            data: {
              failed_attempts: nextAttempts,
              locked_until: nextAttempts >= input.maximumAttempts ? input.lockedUntil : null,
              updated_at: input.attemptedAt,
            },
          });
          return null;
        }

        const row = await transaction.applications.findUnique({
          where: { id: credential.application_id },
          select: wordExportSelect,
        });
        if (row === null) return null;
        await transaction.application_export_credentials.update({
          where: { id: credential.id },
          data: {
            failed_attempts: 0,
            locked_until: null,
            updated_at: input.attemptedAt,
          },
        });
        await transaction.audit_logs.create({
          data: {
            actor_id: null,
            action: "APPLICATION_WORD_EXPORT_REQUESTED",
            entity_type: "application",
            entity_id: credential.application_id,
            metadata: {
              channel: "student",
              requestId: input.requestId,
            },
          },
        });
        return mapRecord(row);
      }),
    );
  }
}
