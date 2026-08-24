import { queryManagedCatalogs } from "@/composition/catalogs";
import { createCatalogDetailHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const GET = createCatalogDetailHandler(queryManagedCatalogs.admissionPeriod.bind(queryManagedCatalogs), "Admission period");
