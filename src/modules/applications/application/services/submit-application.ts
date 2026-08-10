import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/index";
import {
  systemClock,
  type Clock,
} from "../../../../shared/time/index";
import type { CatalogRepository } from "../../../catalogs/index";
import type { ValidateRegistrationLink } from "../../../registration-links/index";
import { isApplicationSubmittable } from "../../domain/application-status-rules";
import type { SubmittedApplicationResultDto } from "../dto/application-dto";
import { toSubmittedApplicationResultDto } from "../mappers/application-mapper";
import { DefaultSubmissionPolicy } from "../policies/default-submission-policy";
import type {
  ApplicationRepository,
  SubmissionPolicy,
} from "../ports/application-repository";
import {
  parseApplicationIdentifier,
  parseCreateDraftApplicationInput,
  parseSubmitApplicationInput,
  WORD_EXPORT_TEXT_LIMITS,
} from "../validation/application-schemas";
import { ExportCredentialFactory } from "@/modules/word-export/application/export-credential";

export class SubmitApplication {
  constructor(
    private readonly validateRegistrationLink: ValidateRegistrationLink,
    private readonly catalogRepository: CatalogRepository,
    private readonly applicationRepository: ApplicationRepository,
    private readonly submissionPolicy: SubmissionPolicy =
      new DefaultSubmissionPolicy(),
    private readonly clock: Clock = systemClock,
    private readonly credentialFactory = new ExportCredentialFactory(),
  ) {}

  async execute(
    tokenInput: unknown,
    applicationIdInput: unknown,
    input: unknown,
  ): Promise<SubmittedApplicationResultDto> {
    const applicationId = parseApplicationIdentifier(applicationIdInput);
    const values = parseSubmitApplicationInput(input);
    const { link, admissionPeriod } =
      await this.validateRegistrationLink.execute(tokenInput);
    const application =
      await this.applicationRepository.findByRegistrationContext(
        link.id,
        applicationId,
      );

    if (application === null) {
      throw new NotFoundError("Application");
    }

    if (!isApplicationSubmittable(application.status)) {
      throw new ConflictError("The application has already been submitted.");
    }

    if (application.version !== values.expectedVersion) {
      throw new ConflictError(
        "The application was changed by another request.",
      );
    }

    if (application.admissionPeriodId !== admissionPeriod.id) {
      throw new ConflictError(
        "The application does not belong to the active admission period.",
      );
    }

    if (
      link.majorId !== null &&
      application.majorId !== link.majorId
    ) {
      throw new ConflictError(
        "The application major does not match the registration link.",
      );
    }

    const major = application.majorId === null
      ? null
      : await this.catalogRepository.findActiveMajorById(application.majorId);
    if (application.majorId !== null && major === null) {
      throw new ValidationError([
        {
          path: ["majorId"],
          code: "invalid_major",
          message: "The selected major is not available.",
        },
      ]);
    }

    if (major !== null && major.name.length > WORD_EXPORT_TEXT_LIMITS.majorName) {
      throw new ValidationError([{
        path: ["majorId"],
        code: "print_capacity",
        message: "Tên ngành vượt quá khả năng hiển thị của phiếu Word một trang.",
      }]);
    }

    parseCreateDraftApplicationInput({
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
      relatives: application.relatives.map(({ position, fullName, relationship, occupation, phone, address }) => ({
        position, fullName, relationship, occupation, phone, address,
      })),
    });

    const issues = this.submissionPolicy.validate(application);

    if (issues.length > 0) {
      throw new ValidationError(
        issues,
        "The application is incomplete and cannot be submitted.",
      );
    }

    const credential = this.credentialFactory.create();
    const submitted = await this.applicationRepository.submit({
      applicationId,
      registrationLinkId: link.id,
      expectedVersion: values.expectedVersion,
      expectedStatus: application.status,
      submittedAt: this.clock.now(),
      exportCredentialDigest: credential.digest,
    });

    return toSubmittedApplicationResultDto(submitted, credential.code);
  }
}
