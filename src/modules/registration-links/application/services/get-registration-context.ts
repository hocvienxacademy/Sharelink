import { NotFoundError } from "../../../../shared/errors/index";
import {
  type CatalogRepository,
  toAdmissionPeriodDto,
  toMajorItemDto,
} from "../../../catalogs/index";
import type { RegistrationContextDto } from "../dto/registration-context-dto";
import { ValidateRegistrationLink } from "./validate-registration-link";

export class GetRegistrationContext {
  constructor(
    private readonly validateRegistrationLink: ValidateRegistrationLink,
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(tokenInput: unknown): Promise<RegistrationContextDto> {
    const { link, admissionPeriod } =
      await this.validateRegistrationLink.execute(tokenInput);

    const majors =
      link.majorId === null
        ? await this.catalogRepository.listActiveMajors()
        : await this.getFixedMajor(link.majorId);

    return {
      status: link.status,
      admissionPeriod: toAdmissionPeriodDto(admissionPeriod),
      majors: majors.map(toMajorItemDto),
      studentNameHint: link.studentNameHint,
      entryQualification: link.entryQualification,
      hasApplication: link.applicationId !== null,
      application:
        link.applicationId === null || link.applicationStatus === null
          ? null
          : {
              id: link.applicationId,
              status: link.applicationStatus,
            },
    };
  }

  private async getFixedMajor(majorId: string) {
    const major = await this.catalogRepository.findActiveMajorById(majorId);

    if (major === null) {
      throw new NotFoundError("Registration link");
    }

    return [major];
  }
}
