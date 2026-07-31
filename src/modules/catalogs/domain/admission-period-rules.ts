import type { DateOnly } from "../../../shared/time/index";
import type { AdmissionPeriod } from "./catalog-repository";

export function isAdmissionPeriodOpen(
  period: AdmissionPeriod,
  today: DateOnly,
): boolean {
  if (!period.isActive) {
    return false;
  }

  if (period.startDate !== null && today < period.startDate) {
    return false;
  }

  return period.endDate === null || today <= period.endDate;
}
