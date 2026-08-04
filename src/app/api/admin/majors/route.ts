import { catalogAdministration, queryManagedCatalogs } from "@/composition/catalogs";
import { createCatalogCreateHandler, createCatalogListHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const GET = createCatalogListHandler(queryManagedCatalogs.listMajors.bind(queryManagedCatalogs));
export const POST = createCatalogCreateHandler(catalogAdministration.createMajor.bind(catalogAdministration), "admin-major-create");
