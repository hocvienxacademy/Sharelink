import { ConflictError, NotFoundError } from "../../../../shared/errors/index";
import type { ValidateRegistrationLink } from "../../../registration-links/index";
import type { EditableApplicationDto } from "../dto/application-dto";
import { toEditableApplicationDto } from "../mappers/application-mapper";
import type { ApplicationRepository } from "../ports/application-repository";
import { parseApplicationIdentifier } from "../validation/application-schemas";

export class GetEditableApplication {
  constructor(
    private readonly validateRegistrationLink: ValidateRegistrationLink,
    private readonly applicationRepository: ApplicationRepository,
  ) {}

  async execute(
    tokenInput: unknown,
    applicationIdInput: unknown,
  ): Promise<EditableApplicationDto> {
    const applicationId = parseApplicationIdentifier(applicationIdInput);
    const { link } =
      await this.validateRegistrationLink.execute(tokenInput);
    const application =
      await this.applicationRepository.findByRegistrationContext(
        link.id,
        applicationId,
      );

    if (application === null) {
      throw new NotFoundError("Application");
    }

    if (application.status !== "DRAFT") {
      throw new ConflictError("The application is not editable.");
    }

    return toEditableApplicationDto(application);
  }
}
