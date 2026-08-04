import { queryManagedCatalogs } from "@/composition/catalogs";
import { createCatalogHistoryHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const GET = createCatalogHistoryHandler("admission_periods", queryManagedCatalogs.history.bind(queryManagedCatalogs));
