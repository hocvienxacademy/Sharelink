import type {
  AdmissionPeriod,
  CatalogRepository,
  Major,
} from "../domain/catalog-repository";
import {
  executePrismaOperation,
  prisma,
} from "../../../shared/infrastructure/database/prisma/index";
import { toDatabaseDateOnly } from "../../../shared/time/index";

const admissionPeriodSelect = {
  id: true,
  code: true,
  name: true,
  start_date: true,
  end_date: true,
  is_active: true,
} as const;

const majorSelect = {
  id: true,
  code: true,
  name: true,
  display_order: true,
  is_active: true,
} as const;

function mapAdmissionPeriod(record: {
  id: string;
  code: string;
  name: string;
  start_date: Date | null;
  end_date: Date | null;
  is_active: boolean;
}): AdmissionPeriod {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    startDate:
      record.start_date === null
        ? null
        : toDatabaseDateOnly(record.start_date),
    endDate:
      record.end_date === null ? null : toDatabaseDateOnly(record.end_date),
    isActive: record.is_active,
  };
}

function mapMajor(record: {
  id: string;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
}): Major {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    displayOrder: record.display_order,
    isActive: record.is_active,
  };
}

export class PrismaCatalogRepository implements CatalogRepository {
  async findAdmissionPeriodById(id: string): Promise<AdmissionPeriod | null> {
    const record = await executePrismaOperation(() =>
      prisma.admission_periods.findUnique({
        where: { id },
        select: admissionPeriodSelect,
      }),
    );

    return record === null ? null : mapAdmissionPeriod(record);
  }

  async findActiveMajorById(id: string): Promise<Major | null> {
    const record = await executePrismaOperation(() =>
      prisma.majors.findFirst({
        where: {
          id,
          is_active: true,
        },
        select: majorSelect,
      }),
    );

    return record === null ? null : mapMajor(record);
  }

  async listActiveAdmissionPeriods(): Promise<readonly AdmissionPeriod[]> {
    const records = await executePrismaOperation(() =>
      prisma.admission_periods.findMany({
        where: { is_active: true },
        orderBy: [{ start_date: "asc" }, { code: "asc" }],
        select: admissionPeriodSelect,
      }),
    );

    return records.map(mapAdmissionPeriod);
  }

  async listActiveMajors(): Promise<readonly Major[]> {
    const records = await executePrismaOperation(() =>
      prisma.majors.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: "asc" }, { code: "asc" }],
        select: majorSelect,
      }),
    );

    return records.map(mapMajor);
  }
}
