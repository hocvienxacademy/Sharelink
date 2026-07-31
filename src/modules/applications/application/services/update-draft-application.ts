import { ConflictError, NotFoundError } from "../../../../shared/errors/index";
import type { CatalogRepository } from "../../../catalogs/index";
import type { ValidateRegistrationLink } from "../../../registration-links/index";
import type { EditableApplicationDto } from "../dto/application-dto";
import { toEditableApplicationDto } from "../mappers/application-mapper";
import type { ApplicationRepository } from "../ports/application-repository";
import {
  parseApplicationIdentifier,
  parseUpdateDraftApplicationInput,
} from "../validation/application-schemas";
import {
  resolveEntryQualification,
  resolveMajorId,
} from "./application-rules";

export class UpdateDraftApplication {
  constructor(
    private readonly validateRegistrationLink: ValidateRegistrationLink,
    private readonly catalogRepository: CatalogRepository,
    private readonly applicationRepository: ApplicationRepository,
  ) {}

  async execute(
    tokenInput: unknown,
    applicationIdInput: unknown,
    input: unknown,
  ): Promise<EditableApplicationDto> {
    const applicationId = parseApplicationIdentifier(applicationIdInput);
    const values = parseUpdateDraftApplicationInput(input);
    const { link } =
      await this.validateRegistrationLink.execute(tokenInput);
    const existing =
      await this.applicationRepository.findByRegistrationContext(
        link.id,
        applicationId,
      );

    if (existing === null) {
      throw new NotFoundError("Application");
    }

    if (existing.status !== "DRAFT") {
      throw new ConflictError("The application is not editable.");
    }

    if (existing.version !== values.expectedVersion) {
      throw new ConflictError(
        "The application was changed by another request.",
      );
    }

    const majorId = await resolveMajorId(
      this.catalogRepository,
      link,
      values.majorId,
    );
    const entryQualification = resolveEntryQualification(
      link,
      values.entryQualification,
    );

    const application = await this.applicationRepository.updateDraft({
      applicationId,
      registrationLinkId: link.id,
      expectedVersion: values.expectedVersion,
      majorId,
      entryQualification,
      values,
    });

    return toEditableApplicationDto(application);
  }
}
