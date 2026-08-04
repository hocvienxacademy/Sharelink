import { catalogAdministration, queryManagedCatalogs } from "@/composition/catalogs";
import { createCatalogDetailHandler, createCatalogMutationHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const GET = createCatalogDetailHandler(queryManagedCatalogs.major.bind(queryManagedCatalogs), "Major");
export const PATCH = createCatalogMutationHandler(catalogAdministration.updateMajor.bind(catalogAdministration), "admin-major-update");
