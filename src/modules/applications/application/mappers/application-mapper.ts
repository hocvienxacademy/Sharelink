import type { Application } from "../../domain/application";
import type {
  DraftApplicationDto,
  EditableApplicationDto,
  SubmittedApplicationResultDto,
} from "../dto/application-dto";

export function toDraftApplicationDto(
  application: Application,
): DraftApplicationDto {
  return {
    id: application.id,
    status: application.status,
    version: application.version,
  };
}

export function toEditableApplicationDto(
  application: Application,
): EditableApplicationDto {
  return {
    ...toDraftApplicationDto(application),
    latestRevisionReason: application.latestRevisionReason ?? null,
    majorId: application.majorId,
    entryQualification: application.entryQualification,
    fullName: application.fullName,
    gender: application.gender,
    dateOfBirth: application.dateOfBirth,
    placeOfBirth: application.placeOfBirth,
    ethnicity: application.ethnicity,
    religion: application.religion,
    nationality: application.nationality,
    citizenId: application.citizenId,
    citizenIdIssuedDate: application.citizenIdIssuedDate,
    citizenIdIssuedPlace: application.citizenIdIssuedPlace,
    permanentAddress: application.permanentAddress,
    workplace: application.workplace,
    phone: application.phone,
    email: application.email,
    contactAddress: application.contactAddress,
    admissionDiploma: application.admissionDiploma,
    graduateMajor: application.graduateMajor,
    graduationYear: application.graduationYear,
    highSchoolName: application.highSchoolName,
    highSchoolWard: application.highSchoolWard,
    highSchoolProvince: application.highSchoolProvince,
    declarationPlace: application.declarationPlace,
    declarationDate: application.declarationDate,
    declarationConfirmed: application.declarationConfirmed,
    dataProcessingConsent: application.dataProcessingConsent,
    relatives: application.relatives.map((relative) => ({
      position: relative.position,
      fullName: relative.fullName,
      relationship: relative.relationship,
      occupation: relative.occupation,
      phone: relative.phone,
      address: relative.address,
    })),
  };
}

export function toSubmittedApplicationResultDto(
  application: Application,
  downloadCode: string,
): SubmittedApplicationResultDto {
  if (application.submittedAt === null) {
    throw new Error("Submitted application is missing submittedAt.");
  }

  return {
    downloadCode,
    id: application.id,
    status: application.status,
    submittedAt: application.submittedAt.toISOString(),
    version: application.version,
  };
}
