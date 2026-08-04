import { PrismaCatalogRepository } from "../modules/catalogs/infrastructure/index";
import { CatalogAdministrationService, QueryManagedCatalogs } from "@/modules/catalogs";
import { PrismaCatalogManagementRepository } from "@/modules/catalogs/infrastructure/prisma-catalog-management-repository";

export const catalogRepository = new PrismaCatalogRepository();
export const catalogManagementRepository = new PrismaCatalogManagementRepository();
export const catalogAdministration = new CatalogAdministrationService(catalogManagementRepository);
export const queryManagedCatalogs = new QueryManagedCatalogs(catalogManagementRepository);
