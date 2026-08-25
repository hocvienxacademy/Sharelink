import { NotFoundError } from "../../../../shared/errors/index";
import {
  type BankAccountManagementRepository,
  type CatalogRepository,
  toMajorItemDto,
} from "../../../catalogs/index";
import type { RegistrationContextDto } from "../dto/registration-context-dto";
import { ValidateRegistrationLink } from "./validate-registration-link";

export class GetRegistrationContext {
  constructor(
    private readonly validateRegistrationLink: ValidateRegistrationLink,
    private readonly catalogRepository: CatalogRepository,
    private readonly bankAccountRepository: Pick<
      BankAccountManagementRepository,
      "findPublicDefault"
    >,
    private readonly publicSystemSettings: {
      execute(): Promise<{
        readonly applicationFeeAmount: number | null;
        readonly paymentInstructions: string | null;
      }>;
    },
  ) {}

  async execute(tokenInput: unknown): Promise<RegistrationContextDto> {
    const { link } = await this.validateRegistrationLink.execute(tokenInput);

    const [majors, account, settings] = await Promise.all([
      link.majorId === null
        ? this.catalogRepository.listActiveMajors()
        : this.getFixedMajor(link.majorId),
      this.bankAccountRepository.findPublicDefault(),
      this.publicSystemSettings.execute(),
    ]);

    return {
      status: link.status,
      majors: majors.map(toMajorItemDto),
      majorId: link.majorId,
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
      payment: {
        account,
        applicationFeeAmount: settings.applicationFeeAmount,
        instructions: settings.paymentInstructions,
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
