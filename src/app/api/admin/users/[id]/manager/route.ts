import { userAdministration } from "@/composition/users"; import { createUserMutationHandler } from "@/modules/users/presentation/http/admin-user-handlers";
export const POST = createUserMutationHandler(userAdministration.assignManager.bind(userAdministration), "admin-user-manager-assign");
