import { bankAccountAdministration, queryManagedBankAccounts } from "@/composition/catalogs";
import { createBankAccountCreateHandler, createBankAccountListHandler } from "@/modules/catalogs/presentation/http/admin-bank-account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createBankAccountListHandler(queryManagedBankAccounts.list.bind(queryManagedBankAccounts));
export const POST = createBankAccountCreateHandler(bankAccountAdministration.create.bind(bankAccountAdministration));
