import { ConflictError } from "../../../../shared/errors/index";
import type { CatalogRepository } from "../../../catalogs/index";
import type { ValidateRegistrationLink } from "../../../registration-links/index";
import type { DraftApplicationDto } from "../dto/application-dto";
import { toDraftApplicationDto } from "../mappers/application-mapper";
import type { ApplicationRepository } from "../ports/application-repository";
import { parseCreateDraftApplicationInput } from "../validation/application-schemas";
import {
  resolveEntryQualification,
  resolveMajorId,
} from "./application-rules";

export class CreateDraftApplication {
  constructor(
    private readonly validateRegistrationLink: ValidateRegistrationLink,
    private readonly catalogRepository: CatalogRepository,
    private readonly applicationRepository: ApplicationRepository,
  ) {}

  async execute(
    tokenInput: unknown,
    input: unknown,
  ): Promise<DraftApplicationDto> {
    const values = parseCreateDraftApplicationInput(input);
    const { link } = await this.validateRegistrationLink.execute(tokenInput);

    if (
      link.applicationId !== null ||
      (await this.applicationRepository.findByRegistrationLinkId(link.id)) !==
        null
    ) {
      throw new ConflictError(
        "An application already exists for this registration link.",
      );
    }

    const majorId =
      (await resolveMajorId(
        this.catalogRepository,
        link,
        values.majorId,
      )) ?? null;
    const entryQualification =
      resolveEntryQualification(link, values.entryQualification) ?? null;

    const application = await this.applicationRepository.createDraft({
      registrationLinkId: link.id,
      saleId: link.saleId,
      admissionPeriodId: link.admissionPeriodId,
      majorId,
      entryQualification,
      studentNameHint: link.studentNameHint,
      values,
    });

    return toDraftApplicationDto(application);
  }
}
