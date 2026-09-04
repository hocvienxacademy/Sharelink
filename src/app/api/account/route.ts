import { queryUsers, userAdministration } from "@/composition/users";
import { createStaffAccountDetailHandler, createStaffAccountMutationHandler } from "@/modules/users/presentation/http/staff-account-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createStaffAccountDetailHandler(queryUsers.detail.bind(queryUsers));
export const PATCH = createStaffAccountMutationHandler(
  (actor, input, context) => userAdministration.updateProfile(actor, actor.userId, input, context),
  "staff-account-profile-update",
);
