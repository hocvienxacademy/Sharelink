import { ConflictError, NotFoundError } from "../../../../shared/errors/index";
import {
  systemClock,
  type Clock,
} from "../../../../shared/time/index";
import { isAdmissionPeriodOpen } from "../../domain/admission-period-rules";
import type { CatalogRepository } from "../../domain/catalog-repository";
import type { AdmissionPeriodDto } from "../dto/catalog-dto";
import { toAdmissionPeriodDto } from "../mappers/catalog-mapper";

export class GetCurrentAdmissionPeriod {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(): Promise<AdmissionPeriodDto> {
    const periods = await this.catalogRepository.listActiveAdmissionPeriods();
    const currentPeriods = periods.filter((period) =>
      isAdmissionPeriodOpen(period, this.clock.today()),
    );

    if (currentPeriods.length === 0) {
      throw new NotFoundError("Open admission period");
    }

    if (currentPeriods.length > 1) {
      throw new ConflictError(
        "Có nhiều kỳ tuyển sinh đang mở cùng lúc.",
      );
    }

    return toAdmissionPeriodDto(currentPeriods[0]);
  }
}
