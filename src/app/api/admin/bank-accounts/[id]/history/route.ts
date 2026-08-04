import { queryManagedBankAccounts } from "@/composition/catalogs";
import { createBankAccountHistoryHandler } from "@/modules/catalogs/presentation/http/admin-bank-account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createBankAccountHistoryHandler(queryManagedBankAccounts.history.bind(queryManagedBankAccounts));
