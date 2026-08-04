import { NotFoundError } from "../../../../shared/errors/index";
import {
  type CatalogRepository,
  toAdmissionPeriodDto,
  toMajorItemDto,
} from "../../../catalogs/index";
import type { RegistrationContextDto } from "../dto/registration-context-dto";
import { ValidateRegistrationLink } from "./validate-registration-link";
import type { BankAccountManagementRepository } from "../../../catalogs/application/ports/bank-account-management-repository";

export class GetRegistrationContext {
  constructor(
    private readonly validateRegistrationLink: ValidateRegistrationLink,
    private readonly catalogRepository: CatalogRepository,
    private readonly bankAccounts?: Pick<BankAccountManagementRepository, "findPublicDefault">,
  ) {}

  async execute(tokenInput: unknown): Promise<RegistrationContextDto> {
    const { link, admissionPeriod } =
      await this.validateRegistrationLink.execute(tokenInput);

    const majors =
      link.majorId === null
        ? await this.catalogRepository.listActiveMajors()
        : await this.getFixedMajor(link.majorId);

    const bankAccount = await this.bankAccounts?.findPublicDefault() ?? null;

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
      bankAccount,
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
