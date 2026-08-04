import { queryUsers } from "@/composition/users";
import { createUserHistoryHandler } from "@/modules/users/presentation/http/admin-user-handlers";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export const GET = createUserHistoryHandler(queryUsers.history.bind(queryUsers));
