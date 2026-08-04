export type {
  AdmissionPeriod,
  CatalogRepository,
  Major,
} from "./domain/catalog-repository";
export { isAdmissionPeriodOpen } from "./domain/admission-period-rules";
export type {
  AdmissionPeriodDto,
  MajorItemDto,
} from "./application/dto/catalog-dto";
export {
  toAdmissionPeriodDto,
  toMajorItemDto,
} from "./application/mappers/catalog-mapper";
export { GetCurrentAdmissionPeriod } from "./application/services/get-current-admission-period";
export { ListAvailableMajors } from "./application/services/list-available-majors";
export { CatalogAdministrationService, QueryManagedCatalogs } from "./application/services/catalog-administration";
export { CatalogAuthorizationPolicy, assertCatalogAuthorized, type CatalogCapability } from "./application/authorization/catalog-authorization";
export type { CatalogHistoryItem, CatalogManagementRepository, CatalogMutationContext, ManagedAdmissionPeriod, ManagedMajor } from "./application/ports/catalog-management-repository";
export { createAdmissionPeriodSchema, createMajorSchema, updateAdmissionPeriodSchema, updateMajorSchema, catalogTransitionSchema } from "./application/validation/catalog-management-schemas";
export {
  listAdminAdmissionPeriods,
  listAdminBankAccounts,
  listAdminMajors,
  type AdminAdmissionPeriodItem,
  type AdminBankAccountItem,
  type AdminMajorItem,
} from "./infrastructure/prisma-admin-catalog-queries";
