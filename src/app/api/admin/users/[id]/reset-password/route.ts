import { userAdministration } from "@/composition/users"; import { createUserMutationHandler } from "@/modules/users/presentation/http/admin-user-handlers";
export const POST = createUserMutationHandler(userAdministration.resetPassword.bind(userAdministration), "admin-user-password-reset");
