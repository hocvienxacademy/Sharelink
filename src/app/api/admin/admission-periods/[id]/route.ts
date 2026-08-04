import { catalogAdministration, queryManagedCatalogs } from "@/composition/catalogs";
import { createCatalogDetailHandler, createCatalogMutationHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const GET = createCatalogDetailHandler(queryManagedCatalogs.admissionPeriod.bind(queryManagedCatalogs), "Admission period");
export const PATCH = createCatalogMutationHandler(catalogAdministration.updateAdmissionPeriod.bind(catalogAdministration), "admin-admission-period-update");
