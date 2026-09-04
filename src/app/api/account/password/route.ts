import { userAdministration } from "@/composition/users";
import { createStaffAccountMutationHandler } from "@/modules/users/presentation/http/staff-account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createStaffAccountMutationHandler(
  userAdministration.changeOwnPassword.bind(userAdministration),
  "staff-account-password-change",
  undefined,
  { endpoint: "account-password" },
);
