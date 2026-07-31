import {
  executePrismaOperation,
  prisma,
} from "../../../shared/infrastructure/database/prisma/index";
import type {
  RegistrationLink,
  RegistrationLinkRepository,
} from "../domain/registration-link";

export class PrismaRegistrationLinkRepository
  implements RegistrationLinkRepository
{
  async findByPublicToken(token: string): Promise<RegistrationLink | null> {
    const record = await executePrismaOperation(() =>
      prisma.registration_links.findUnique({
        where: { public_token: token },
        select: {
          id: true,
          sale_id: true,
          admission_period_id: true,
          major_id: true,
          student_name_hint: true,
          entry_qualification: true,
          status: true,
          expires_at: true,
          applications: {
            select: { id: true, status: true },
          },
        },
      }),
    );

    if (record === null) {
      return null;
    }

    return {
      id: record.id,
      saleId: record.sale_id,
      admissionPeriodId: record.admission_period_id,
      majorId: record.major_id,
      studentNameHint: record.student_name_hint,
      entryQualification: record.entry_qualification,
      status: record.status,
      expiresAt: record.expires_at,
      applicationId: record.applications?.id ?? null,
      applicationStatus: record.applications?.status ?? null,
    };
  }
}
