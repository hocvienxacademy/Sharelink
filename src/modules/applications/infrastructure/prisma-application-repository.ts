import { Prisma } from "../../../generated/prisma/client";
import { ConflictError } from "../../../shared/errors/index";
import {
  executePrismaOperation,
  prisma,
} from "../../../shared/infrastructure/database/prisma/index";
import { toDatabaseDateOnly } from "../../../shared/time/index";
import type { Application } from "../domain/application";
import type {
  ApplicationRepository,
  CreateDraftPersistenceInput,
  SubmitApplicationPersistenceInput,
  UpdateDraftPersistenceInput,
} from "../application/ports/application-repository";
import type {
  ApplicationRelativeInput,
  CreateDraftApplicationInput,
  UpdateDraftApplicationInput,
} from "../application/validation/application-schemas";

const applicationSelect = {
  id: true,
  registration_link_id: true,
  status: true,
  major_id: true,
  admission_period_id: true,
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
  declaration_confirmed: true,
  data_processing_consent: true,
  submitted_at: true,
  version: true,
  application_relatives: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      full_name: true,
      relationship: true,
      occupation: true,
      phone: true,
      address: true,
    },
  },
} as const satisfies Prisma.applicationsSelect;

type ApplicationRecord = Prisma.applicationsGetPayload<{
  select: typeof applicationSelect;
}>;

type DraftValues =
  | CreateDraftApplicationInput
  | UpdateDraftApplicationInput;

function toDatabaseDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function mapEditableData(values: DraftValues) {
  return {
    date_of_birth: toDatabaseDate(values.dateOfBirth),
    place_of_birth: values.placeOfBirth,
    ethnicity: values.ethnicity,
    religion: values.religion,
    nationality: values.nationality,
    citizen_id: values.citizenId,
    citizen_id_issued_date: toDatabaseDate(values.citizenIdIssuedDate),
    citizen_id_issued_place: values.citizenIdIssuedPlace,
    permanent_address: values.permanentAddress,
    workplace: values.workplace,
    phone: values.phone,
    email: values.email,
    contact_address: values.contactAddress,
    admission_diploma: values.admissionDiploma,
    graduate_major: values.graduateMajor,
    graduation_year: values.graduationYear,
    high_school_name: values.highSchoolName,
    high_school_ward: values.highSchoolWard,
    high_school_province: values.highSchoolProvince,
    declaration_place: values.declarationPlace,
    declaration_date: toDatabaseDate(values.declarationDate),
    declaration_confirmed: values.declarationConfirmed,
    data_processing_consent: values.dataProcessingConsent,
    full_name: values.fullName,
    gender: values.gender,
  };
}

function mapRelativeData(relative: ApplicationRelativeInput) {
  return {
    position: relative.position,
    full_name: relative.fullName,
    relationship: relative.relationship,
    occupation: relative.occupation,
    phone: relative.phone,
    address: relative.address,
  };
}

function mapApplication(record: ApplicationRecord): Application {
  return {
    id: record.id,
    registrationLinkId: record.registration_link_id,
    status: record.status,
    majorId: record.major_id,
    admissionPeriodId: record.admission_period_id,
    entryQualification: record.entry_qualification,
    fullName: record.full_name,
    gender: record.gender,
    dateOfBirth:
      record.date_of_birth === null
        ? null
        : toDatabaseDateOnly(record.date_of_birth),
    placeOfBirth: record.place_of_birth,
    ethnicity: record.ethnicity,
    religion: record.religion,
    nationality: record.nationality,
    citizenId: record.citizen_id,
    citizenIdIssuedDate:
      record.citizen_id_issued_date === null
        ? null
        : toDatabaseDateOnly(record.citizen_id_issued_date),
    citizenIdIssuedPlace: record.citizen_id_issued_place,
    permanentAddress: record.permanent_address,
    workplace: record.workplace,
    phone: record.phone,
    email: record.email,
    contactAddress: record.contact_address,
    admissionDiploma: record.admission_diploma,
    graduateMajor: record.graduate_major,
    graduationYear: record.graduation_year,
    highSchoolName: record.high_school_name,
    highSchoolWard: record.high_school_ward,
    highSchoolProvince: record.high_school_province,
    declarationPlace: record.declaration_place,
    declarationDate:
      record.declaration_date === null
        ? null
        : toDatabaseDateOnly(record.declaration_date),
    declarationConfirmed: record.declaration_confirmed,
    dataProcessingConsent: record.data_processing_consent,
    submittedAt: record.submitted_at,
    version: record.version,
    relatives: record.application_relatives.map((relative) => ({
      id: relative.id,
      position: relative.position,
      fullName: relative.full_name,
      relationship: relative.relationship,
      occupation: relative.occupation,
      phone: relative.phone,
      address: relative.address,
    })),
  };
}

async function loadApplication(
  transaction: Prisma.TransactionClient,
  applicationId: string,
): Promise<Application> {
  const record = await transaction.applications.findUniqueOrThrow({
    where: { id: applicationId },
    select: applicationSelect,
  });

  return mapApplication(record);
}

async function synchronizeRelatives(
  transaction: Prisma.TransactionClient,
  applicationId: string,
  relatives: readonly ApplicationRelativeInput[],
  updatedAt: Date,
): Promise<void> {
  const positions = relatives.map((relative) => relative.position);

  await transaction.application_relatives.deleteMany({
    where:
      positions.length === 0
        ? { application_id: applicationId }
        : {
            application_id: applicationId,
            position: { notIn: positions },
          },
  });

  for (const relative of relatives) {
    const data = mapRelativeData(relative);

    await transaction.application_relatives.upsert({
      where: {
        application_id_position: {
          application_id: applicationId,
          position: relative.position,
        },
      },
      create: {
        application_id: applicationId,
        ...data,
      },
      update: {
        ...data,
        updated_at: updatedAt,
      },
    });
  }
}

export class PrismaApplicationRepository implements ApplicationRepository {
  async createDraft(
    input: CreateDraftPersistenceInput,
  ): Promise<Application> {
    return executePrismaOperation(() =>
      prisma.$transaction(async (transaction) => {
        const now = new Date();
        const fullName =
          input.values.fullName === undefined
            ? input.studentNameHint
            : input.values.fullName;
        const relatives = input.values.relatives ?? [];
        const record = await transaction.applications.create({
          data: {
            ...mapEditableData(input.values),
            full_name: fullName,
            registration_link_id: input.registrationLinkId,
            sale_id: input.saleId,
            admission_period_id: input.admissionPeriodId,
            major_id: input.majorId,
            entry_qualification: input.entryQualification,
            status: "DRAFT",
            application_relatives:
              relatives.length === 0
                ? undefined
                : {
                    create: relatives.map(mapRelativeData),
                  },
            application_status_histories: {
              create: {
                previous_status: null,
                new_status: "DRAFT",
              },
            },
            updated_at: now,
          },
          select: applicationSelect,
        });

        return mapApplication(record);
      }),
    );
  }

  async findByRegistrationContext(
    registrationLinkId: string,
    applicationId: string,
  ): Promise<Application | null> {
    const record = await executePrismaOperation(() =>
      prisma.applications.findFirst({
        where: {
          id: applicationId,
          registration_link_id: registrationLinkId,
        },
        select: applicationSelect,
      }),
    );

    return record === null ? null : mapApplication(record);
  }

  async findByRegistrationLinkId(
    registrationLinkId: string,
  ): Promise<Application | null> {
    const record = await executePrismaOperation(() =>
      prisma.applications.findUnique({
        where: { registration_link_id: registrationLinkId },
        select: applicationSelect,
      }),
    );

    return record === null ? null : mapApplication(record);
  }

  async updateDraft(
    input: UpdateDraftPersistenceInput,
  ): Promise<Application> {
    return executePrismaOperation(() =>
      prisma.$transaction(async (transaction) => {
        const updatedAt = new Date();
        const updateResult = await transaction.applications.updateMany({
          where: {
            id: input.applicationId,
            registration_link_id: input.registrationLinkId,
            status: "DRAFT",
            version: input.expectedVersion,
          },
          data: {
            ...mapEditableData(input.values),
            major_id: input.majorId,
            entry_qualification: input.entryQualification,
            updated_at: updatedAt,
            version: { increment: 1 },
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictError(
            "The application was changed by another request.",
          );
        }

        if (input.values.relatives !== undefined) {
          await synchronizeRelatives(
            transaction,
            input.applicationId,
            input.values.relatives,
            updatedAt,
          );
        }

        return loadApplication(transaction, input.applicationId);
      }),
    );
  }

  async submit(
    input: SubmitApplicationPersistenceInput,
  ): Promise<Application> {
    return executePrismaOperation(() =>
      prisma.$transaction(async (transaction) => {
        const updateResult = await transaction.applications.updateMany({
          where: {
            id: input.applicationId,
            registration_link_id: input.registrationLinkId,
            status: "DRAFT",
            version: input.expectedVersion,
          },
          data: {
            status: "SUBMITTED",
            submitted_at: input.submittedAt,
            updated_at: input.submittedAt,
            version: { increment: 1 },
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictError(
            "The application was changed or already submitted.",
          );
        }

        await transaction.application_status_histories.create({
          data: {
            application_id: input.applicationId,
            previous_status: "DRAFT",
            new_status: "SUBMITTED",
          },
        });

        return loadApplication(transaction, input.applicationId);
      }),
    );
  }
}
