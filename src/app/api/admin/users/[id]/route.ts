import { queryUsers, userAdministration } from "@/composition/users";
import { createUserDetailHandler, createUserMutationHandler } from "@/modules/users/presentation/http/admin-user-handlers";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = createUserDetailHandler(queryUsers.detail.bind(queryUsers));
export const PATCH = createUserMutationHandler(userAdministration.updateProfile.bind(userAdministration), "admin-user-profile-update");
