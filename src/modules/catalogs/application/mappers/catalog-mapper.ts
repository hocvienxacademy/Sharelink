import type {
  AdmissionPeriod,
  Major,
} from "../../domain/catalog-repository";
import type {
  AdmissionPeriodDto,
  MajorItemDto,
} from "../dto/catalog-dto";

export function toAdmissionPeriodDto(
  period: AdmissionPeriod,
): AdmissionPeriodDto {
  return {
    code: period.code,
    name: period.name,
    startDate: period.startDate,
    endDate: period.endDate,
  };
}

export function toMajorItemDto(major: Major): MajorItemDto {
  return {
    id: major.id,
    code: major.code,
    name: major.name,
  };
}
