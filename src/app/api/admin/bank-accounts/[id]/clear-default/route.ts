import { bankAccountAdministration } from "@/composition/catalogs";
import { createBankAccountMutationHandler } from "@/modules/catalogs/presentation/http/admin-bank-account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createBankAccountMutationHandler(
  bankAccountAdministration.clearDefault.bind(bankAccountAdministration),
  "admin-bank-account-clear-default",
);
