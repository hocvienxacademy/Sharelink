import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/index";
import {
  systemClock,
  type Clock,
} from "../../../../shared/time/index";
import {
  isAdmissionPeriodOpen,
  type AdmissionPeriod,
  type CatalogRepository,
} from "../../../catalogs/index";
import type {
  RegistrationLink,
  RegistrationLinkRepository,
} from "../../domain/registration-link";
import { parseRegistrationToken } from "../validation/registration-token-schema";

export interface ValidatedRegistrationLink {
  readonly link: RegistrationLink;
  readonly admissionPeriod: AdmissionPeriod;
}

export class ValidateRegistrationLink {
  constructor(
    private readonly registrationLinkRepository: RegistrationLinkRepository,
    private readonly catalogRepository: CatalogRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(tokenInput: unknown): Promise<ValidatedRegistrationLink> {
    const token = parseRegistrationToken(tokenInput);
    const link = await this.registrationLinkRepository.findByPublicToken(token);

    if (
      link === null ||
      link.status !== "ACTIVE" ||
      (link.expiresAt !== null && link.expiresAt <= this.clock.now())
    ) {
      throw new NotFoundError("Registration link");
    }

    const admissionPeriod = await this.resolveAdmissionPeriod(link);

    if (!isAdmissionPeriodOpen(admissionPeriod, this.clock.today())) {
      throw new NotFoundError("Registration link");
    }

    return {
      link,
      admissionPeriod,
    };
  }

  private async resolveAdmissionPeriod(
    link: RegistrationLink,
  ): Promise<AdmissionPeriod> {
    if (link.admissionPeriodId !== null) {
      const linkedPeriod =
        await this.catalogRepository.findAdmissionPeriodById(
          link.admissionPeriodId,
        );

      if (linkedPeriod === null) {
        throw new NotFoundError("Registration link");
      }

      return linkedPeriod;
    }

    const periods =
      await this.catalogRepository.listActiveAdmissionPeriods();
    const openPeriods = periods.filter((period) =>
      isAdmissionPeriodOpen(period, this.clock.today()),
    );

    if (openPeriods.length === 0) {
      throw new NotFoundError("Registration link");
    }

    if (openPeriods.length > 1) {
      throw new ConflictError(
        "Multiple admission periods are open at the same time.",
      );
    }

    return openPeriods[0];
  }
}
