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
  parseSubmitApplicationInput,
} from "../validation/application-schemas";

export class SubmitApplication {
  constructor(
    private readonly validateRegistrationLink: ValidateRegistrationLink,
    private readonly catalogRepository: CatalogRepository,
    private readonly applicationRepository: ApplicationRepository,
    private readonly submissionPolicy: SubmissionPolicy =
      new DefaultSubmissionPolicy(),
    private readonly clock: Clock = systemClock,
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

    if (
      application.majorId !== null &&
      (await this.catalogRepository.findActiveMajorById(
        application.majorId,
      )) === null
    ) {
      throw new ValidationError([
        {
          path: ["majorId"],
          code: "invalid_major",
          message: "The selected major is not available.",
        },
      ]);
    }

    const issues = this.submissionPolicy.validate(application);

    if (issues.length > 0) {
      throw new ValidationError(
        issues,
        "The application is incomplete and cannot be submitted.",
      );
    }

    const submitted = await this.applicationRepository.submit({
      applicationId,
      registrationLinkId: link.id,
      expectedVersion: values.expectedVersion,
      submittedAt: this.clock.now(),
    });

    return toSubmittedApplicationResultDto(submitted);
  }
}
