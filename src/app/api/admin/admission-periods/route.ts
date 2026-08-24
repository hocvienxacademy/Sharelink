import { queryManagedCatalogs } from "@/composition/catalogs";
import { createCatalogListHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const GET = createCatalogListHandler(queryManagedCatalogs.listAdmissionPeriods.bind(queryManagedCatalogs));
