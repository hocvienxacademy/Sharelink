import { catalogAdministration, queryManagedCatalogs } from "@/composition/catalogs";
import { createCatalogCreateHandler, createCatalogListHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const GET = createCatalogListHandler(queryManagedCatalogs.listAdmissionPeriods.bind(queryManagedCatalogs));
export const POST = createCatalogCreateHandler(catalogAdministration.createAdmissionPeriod.bind(catalogAdministration), "admin-admission-period-create");
