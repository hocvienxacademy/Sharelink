import { bankAccountAdministration } from "@/composition/catalogs";
import { createBankAccountMutationHandler } from "@/modules/catalogs/presentation/http/admin-bank-account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createBankAccountMutationHandler(
  (actor, id, input, context) => bankAccountAdministration.transition(actor, id, false, input, context),
  "admin-bank-account-deactivate",
);
