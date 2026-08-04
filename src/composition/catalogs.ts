import { PrismaCatalogRepository } from "../modules/catalogs/infrastructure/index";
import { CatalogAdministrationService, QueryManagedCatalogs } from "@/modules/catalogs";
import { PrismaCatalogManagementRepository } from "@/modules/catalogs/infrastructure/prisma-catalog-management-repository";
import { BankAccountAdministrationService, QueryManagedBankAccounts } from "@/modules/catalogs";
import { PrismaBankAccountManagementRepository } from "@/modules/catalogs/infrastructure/prisma-bank-account-management-repository";

export const catalogRepository = new PrismaCatalogRepository();
export const catalogManagementRepository = new PrismaCatalogManagementRepository();
export const catalogAdministration = new CatalogAdministrationService(catalogManagementRepository);
export const queryManagedCatalogs = new QueryManagedCatalogs(catalogManagementRepository);
export const bankAccountManagementRepository = new PrismaBankAccountManagementRepository();
export const bankAccountAdministration = new BankAccountAdministrationService(bankAccountManagementRepository);
export const queryManagedBankAccounts = new QueryManagedBankAccounts(bankAccountManagementRepository);
