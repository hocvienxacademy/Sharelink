import { bankAccountAdministration, queryManagedBankAccounts } from "@/composition/catalogs";
import { createBankAccountDetailHandler, createBankAccountMutationHandler } from "@/modules/catalogs/presentation/http/admin-bank-account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createBankAccountDetailHandler(queryManagedBankAccounts.find.bind(queryManagedBankAccounts));
export const PATCH = createBankAccountMutationHandler(bankAccountAdministration.update.bind(bankAccountAdministration), "admin-bank-account-update");
