import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { executePrismaOperation } from "@/shared/infrastructure/database/prisma";
import { toDatabaseDateOnly } from "@/shared/time";
import type { StaffApplicationAuthorizationResource } from "@/modules/applications/application/authorization/staff-application-authorization";
import type {
  ApplicationWordExportRecord,
  StaffWordDownloadInput,
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

function staffScope(actor: StaffWordDownloadInput["actor"]): Prisma.applicationsWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "SALE") return { sale_id: actor.userId };
  return { users_applications_sale_idTousers: { manager_id: actor.userId } };
}

export class PrismaWordExportRepository implements WordExportRepository {
  async loadForSubmissionEmail(
    applicationId: string,
  ): Promise<ApplicationWordExportRecord | null> {
    const row = await executePrismaOperation(() =>
      prisma.applications.findFirst({
        where: {
          id: applicationId,
          submitted_at: { not: null },
          status: { notIn: ["DRAFT", "CANCELLED"] },
        },
        select: wordExportSelect,
      }),
    );
    return row === null ? null : mapRecord(row);
  }

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
}
