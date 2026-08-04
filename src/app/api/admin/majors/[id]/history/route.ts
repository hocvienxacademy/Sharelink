import { queryManagedCatalogs } from "@/composition/catalogs";
import { createCatalogHistoryHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const GET = createCatalogHistoryHandler("majors", queryManagedCatalogs.history.bind(queryManagedCatalogs));
