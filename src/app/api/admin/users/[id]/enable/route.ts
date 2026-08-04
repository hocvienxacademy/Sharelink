import { userAdministration } from "@/composition/users"; import { createAccountTransitionHandler } from "@/modules/users/presentation/http/admin-user-handlers";
export const POST = createAccountTransitionHandler("ACTIVE", userAdministration.transitionAccount.bind(userAdministration));
